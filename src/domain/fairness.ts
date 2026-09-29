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
