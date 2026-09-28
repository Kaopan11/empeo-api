import type { SupabaseClient } from "@supabase/supabase-js";

export type PerformanceTier = "HIGH" | "CORE" | "LOW";

export const TIER_Z_HIGH = 0.5;
export const TIER_Z_LOW = -0.5;

export interface SubmittedRow {
  evaluationId: string;
  reviewerId: string;
  totalRawScore: number;
}

export interface FairnessEvaluationUpdate {
  evaluationId: string;
  normalizedScore: number;
  performanceTier: PerformanceTier;
}

export interface FairnessManagerMetric {
  managerId: string;
  biasIndex: number;
}

export interface FairnessResult {
  evaluationUpdates: FairnessEvaluationUpdate[];
  managerMetrics: FairnessManagerMetric[];
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function populationMean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function populationStdDev(values: number[], mean?: number): number {
  if (values.length === 0) {
    return 0;
  }
  const mu = mean ?? populationMean(values)!;
  if (values.length === 1) {
    return 0;
  }
  const variance =
    values.reduce((sum, value) => sum + (value - mu) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function tierFromZ(z: number): PerformanceTier {
  if (z > TIER_Z_HIGH) {
    return "HIGH";
  }
  if (z < TIER_Z_LOW) {
    return "LOW";
  }
  return "CORE";
}

export function teamZ(raw: number, teamMean: number, teamStd: number): number {
  if (teamStd === 0) {
    return 0;
  }
  return round2((raw - teamMean) / teamStd);
}

export function biasIndex(
  teamMean: number,
  orgMean: number,
  orgStd: number,
): number {
  if (orgStd === 0) {
    return 0;
  }
  return round2((teamMean - orgMean) / orgStd);
}

export function computeFairness(rows: SubmittedRow[]): FairnessResult {
  if (rows.length === 0) {
    return { evaluationUpdates: [], managerMetrics: [] };
  }

  const orgScores = rows.map((row) => row.totalRawScore);
  const orgMean = populationMean(orgScores)!;
  const orgStd = populationStdDev(orgScores, orgMean);

  const byManager = new Map<string, SubmittedRow[]>();
  for (const row of rows) {
    const team = byManager.get(row.reviewerId) ?? [];
    team.push(row);
    byManager.set(row.reviewerId, team);
  }

  const managerMetrics: FairnessManagerMetric[] = [];
  const evaluationUpdates: FairnessEvaluationUpdate[] = [];

  for (const [managerId, teamRows] of byManager) {
    const teamScores = teamRows.map((row) => row.totalRawScore);
    const teamMean = populationMean(teamScores)!;
    const teamStd = populationStdDev(teamScores, teamMean);
    managerMetrics.push({
      managerId,
      biasIndex: biasIndex(teamMean, orgMean, orgStd),
    });

    for (const row of teamRows) {
      const z = teamZ(row.totalRawScore, teamMean, teamStd);
      evaluationUpdates.push({
        evaluationId: row.evaluationId,
        normalizedScore: z,
        performanceTier: tierFromZ(z),
      });
    }
  }

  return { evaluationUpdates, managerMetrics };
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cycleIdFromParam(value: string): string | null {
  return UUID.test(value) ? value : null;
}

export async function recalculateFairnessForCycle(
  supabase: SupabaseClient,
  cycleId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: evaluations, error: loadError } = await supabase
    .from("evaluations")
    .select("id, reviewer_id, status, total_raw_score")
    .eq("cycle_id", cycleId);
  if (loadError) {
    return { ok: false, error: loadError.message };
  }

  const rows: SubmittedRow[] = [];
  for (const row of evaluations ?? []) {
    if (row.status !== "SUBMITTED" || row.total_raw_score == null) {
      continue;
    }
    rows.push({
      evaluationId: row.id,
      reviewerId: row.reviewer_id,
      totalRawScore: Number(row.total_raw_score),
    });
  }

  const computed = computeFairness(rows);
  const updateById = new Map(
    computed.evaluationUpdates.map((update) => [update.evaluationId, update]),
  );

  for (const row of evaluations ?? []) {
    const update = updateById.get(row.id);
    const { error } = await supabase
      .from("evaluations")
      .update({
        normalized_score: update?.normalizedScore ?? null,
        performance_tier: update?.performanceTier ?? null,
      })
      .eq("id", row.id);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  const { error: deleteMetricsError } = await supabase
    .from("manager_cycle_metrics")
    .delete()
    .eq("cycle_id", cycleId);
  if (deleteMetricsError) {
    return { ok: false, error: deleteMetricsError.message };
  }

  if (computed.managerMetrics.length === 0) {
    return { ok: true };
  }

  const now = new Date().toISOString();
  const { error: insertMetricsError } = await supabase
    .from("manager_cycle_metrics")
    .insert(
      computed.managerMetrics.map((metric) => ({
        cycle_id: cycleId,
        manager_id: metric.managerId,
        bias_index: metric.biasIndex,
        updated_at: now,
      })),
    );
  if (insertMetricsError) {
    return { ok: false, error: insertMetricsError.message };
  }

  return { ok: true };
}
