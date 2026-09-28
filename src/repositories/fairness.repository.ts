import {
  computeFairness,
  type FairnessManagerMetric,
  type SubmittedRow,
} from "../domain/fairness";
import { supabase } from "./supabase";

interface CycleEvaluationRow {
  id: string;
  reviewer_id: string;
  status: string;
  total_raw_score: number | null;
}

export async function listManagerCycleMetrics(cycleId: string): Promise<
  | {
      ok: true;
      data: { manager_id: string; bias_index: number | null; updated_at: string }[];
    }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("manager_cycle_metrics")
    .select("manager_id, bias_index, updated_at")
    .eq("cycle_id", cycleId)
    .overrideTypes<
      { manager_id: string; bias_index: number | null; updated_at: string }[],
      { merge: false }
    >();
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data ?? [] };
}

export async function persistFairnessForCycle(
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
  for (const row of (evaluations ?? []) as CycleEvaluationRow[]) {
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

  for (const row of (evaluations ?? []) as CycleEvaluationRow[]) {
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
      computed.managerMetrics.map((metric: FairnessManagerMetric) => ({
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
