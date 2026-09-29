import {
  populationMean,
  populationStdDev,
  round2,
  type PerformanceTier,
} from "./fairness";
import type { EvaluationStatus } from "../types";

export const BIAS_WATCH_THRESHOLD = 0.5;

export type BiasLabel = "Too lenient" | "Strict" | null;

export interface DashboardUser {
  id: string;
  name: string;
  department: string;
  managerId: string | null;
}

export interface DashboardEvaluation {
  id: string;
  reviewerId: string;
  revieweeId: string;
  status: EvaluationStatus;
  totalRawScore: number | null;
  normalizedScore: number | null;
  performanceTier: PerformanceTier | null;
}

export interface DashboardManagerMetric {
  managerId: string;
  biasIndex: number | null;
}

export interface DashboardInput {
  cycle: { id: string; name: string; endDate: string; status: string; publishedAt: string | null };
  evaluations: DashboardEvaluation[];
  users: DashboardUser[];
  managerMetrics: DashboardManagerMetric[];
  now: Date;
}

export function biasLabel(biasIndex: number | null): BiasLabel {
  if (biasIndex == null) {
    return null;
  }
  if (biasIndex >= BIAS_WATCH_THRESHOLD) {
    return "Too lenient";
  }
  if (biasIndex <= -BIAS_WATCH_THRESHOLD) {
    return "Strict";
  }
  return null;
}

function daysUntil(endDate: string, now: Date): number {
  const [year, month, day] = endDate.split("-").map(Number);
  const end = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((end - start) / 86_400_000);
}

function percent(count: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((count / total) * 100);
}

export function buildDashboard(input: DashboardInput) {
  const byId = new Map(input.users.map((user) => [user.id, user]));
  const totalEmployees = input.evaluations.length;
  const submitted = input.evaluations.filter((row) => row.status === "SUBMITTED").length;
  const inProgress = input.evaluations.filter((row) => row.status === "DRAFT").length;
  const overdue = input.evaluations.filter((row) => row.status === "OVERDUE").length;
  const departments = new Set(
    input.evaluations
      .map((row) => byId.get(row.revieweeId)?.department)
      .filter((dept): dept is string => Boolean(dept)),
  );
  const completionRate = percent(submitted, totalEmployees);

  const tiered = input.evaluations.filter(
    (row) => row.status === "SUBMITTED" && row.performanceTier,
  );
  const high = tiered.filter((row) => row.performanceTier === "HIGH").length;
  const core = tiered.filter((row) => row.performanceTier === "CORE").length;
  const low = tiered.filter((row) => row.performanceTier === "LOW").length;
  const tierTotal = tiered.length;
  const zScores = tiered
    .map((row) => row.normalizedScore)
    .filter((score): score is number => score != null);
  const averageNormalized = populationMean(zScores);
  const calibrationSpread = zScores.length === 0 ? null : round2(populationStdDev(zScores));

  const reviewerIds = [...new Set(input.evaluations.map((row) => row.reviewerId))];
  const biasByManager = new Map(
    input.managerMetrics.map((row) => [row.managerId, row.biasIndex]),
  );
  const managers = reviewerIds
    .map((managerId) => {
      const user = byId.get(managerId);
      const biasIndex = biasByManager.get(managerId) ?? null;
      return {
        managerId,
        name: user?.name ?? "Unknown",
        department: user?.department ?? "—",
        reportCount: input.users.filter((person) => person.managerId === managerId).length,
        biasIndex,
        label: biasLabel(biasIndex),
      };
    })
    .sort((a, b) => Math.abs(b.biasIndex ?? 0) - Math.abs(a.biasIndex ?? 0));

  const talent = [...input.evaluations]
    .map((row) => {
      const reviewee = byId.get(row.revieweeId);
      return {
        userId: row.revieweeId,
        name: reviewee?.name ?? "Unknown",
        department: reviewee?.department ?? "—",
        rawScore: row.totalRawScore,
        normalizedScore: row.normalizedScore,
        tier: row.performanceTier,
        status: row.status,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    cycle: {
      id: input.cycle.id,
      name: input.cycle.name,
      endDate: input.cycle.endDate,
      status: input.cycle.status,
      publishedAt: input.cycle.publishedAt,
    },
    kpis: {
      totalEmployees,
      departments: departments.size,
      submitted,
      inProgress,
      overdue,
      completionRate,
      daysUntilEnd: daysUntil(input.cycle.endDate, input.now),
    },
    distribution: {
      low: { count: low, percent: percent(low, tierTotal) },
      core: { count: core, percent: percent(core, tierTotal) },
      high: { count: high, percent: percent(high, tierTotal) },
      averageNormalized: averageNormalized == null ? null : round2(averageNormalized),
      calibrationSpread,
      confidence: completionRate,
    },
    managers,
    talent,
  };
}
