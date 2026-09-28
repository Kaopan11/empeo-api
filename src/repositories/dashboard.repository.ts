import type { DashboardEvaluation, DashboardUser } from "../domain/dashboard";
import type { PerformanceTier } from "../domain/fairness";
import type { EvaluationStatus } from "../types";
import { supabase } from "./supabase";

const STATUSES: EvaluationStatus[] = ["PENDING", "DRAFT", "SUBMITTED", "OVERDUE"];
const TIERS: PerformanceTier[] = ["HIGH", "CORE", "LOW"];

function asStatus(value: string): EvaluationStatus | null {
  return STATUSES.includes(value as EvaluationStatus) ? (value as EvaluationStatus) : null;
}

function asTier(value: string | null): PerformanceTier | null {
  if (!value) {
    return null;
  }
  return TIERS.includes(value as PerformanceTier) ? (value as PerformanceTier) : null;
}

export async function loadCycleDashboard(cycleId: string): Promise<
  | {
      ok: true;
      data: {
        cycle: { id: string; name: string; endDate: string };
        evaluations: DashboardEvaluation[];
        users: DashboardUser[];
        managerMetrics: { managerId: string; biasIndex: number | null }[];
      };
    }
  | { ok: false; notFound: true }
  | { ok: false; error: string }
> {
  const { data: cycle, error: cycleError } = await supabase
    .from("review_cycles")
    .select("id, name, end_date")
    .eq("id", cycleId)
    .maybeSingle();
  if (cycleError) {
    return { ok: false, error: cycleError.message };
  }
  if (!cycle) {
    return { ok: false, notFound: true };
  }

  const { data: evaluations, error: evalError } = await supabase
    .from("evaluations")
    .select(
      "id, reviewer_id, reviewee_id, status, total_raw_score, normalized_score, performance_tier",
    )
    .eq("cycle_id", cycleId);
  if (evalError) {
    return { ok: false, error: evalError.message };
  }

  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, name, department, manager_id");
  if (userError) {
    return { ok: false, error: userError.message };
  }

  const { data: metrics, error: metricsError } = await supabase
    .from("manager_cycle_metrics")
    .select("manager_id, bias_index")
    .eq("cycle_id", cycleId);
  if (metricsError) {
    return { ok: false, error: metricsError.message };
  }

  const mapped: DashboardEvaluation[] = [];
  for (const row of evaluations ?? []) {
    const status = asStatus(String(row.status));
    if (!status) {
      return { ok: false, error: `Unexpected evaluation status ${row.status}` };
    }
    mapped.push({
      id: String(row.id),
      reviewerId: String(row.reviewer_id),
      revieweeId: String(row.reviewee_id),
      status,
      totalRawScore: row.total_raw_score == null ? null : Number(row.total_raw_score),
      normalizedScore: row.normalized_score == null ? null : Number(row.normalized_score),
      performanceTier: asTier(row.performance_tier == null ? null : String(row.performance_tier)),
    });
  }

  return {
    ok: true,
    data: {
      cycle: {
        id: String(cycle.id),
        name: String(cycle.name),
        endDate: String(cycle.end_date),
      },
      evaluations: mapped,
      users: (users ?? []).map((user) => ({
        id: String(user.id),
        name: String(user.name),
        department: String(user.department),
        managerId: user.manager_id == null ? null : String(user.manager_id),
      })),
      managerMetrics: (metrics ?? []).map((row) => ({
        managerId: String(row.manager_id),
        biasIndex: row.bias_index == null ? null : Number(row.bias_index),
      })),
    },
  };
}
