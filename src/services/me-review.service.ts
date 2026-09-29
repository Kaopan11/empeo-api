import { supabase } from "../repositories/supabase";
import {
  companyAverage,
  employeeReviewGate,
  firstFeedback,
} from "../domain/employee-review";
import { cycleIdFromParam, userIdFromHeader } from "../domain/ids";
import { findUserRole, getCycleById } from "../repositories/cycles.repository";
import type { PerformanceTier } from "../domain/fairness";

const TIERS: PerformanceTier[] = ["HIGH", "CORE", "LOW"];

export type MeReview = {
  published: boolean;
  publishedAt: string | null;
  gate: "waiting_publish" | "waiting_submit" | "visible";
  cycleName: string;
  employeeName: string;
  reviewer: { name: string; department: string } | null;
  evaluation: {
    totalRawScore: number;
    tier: PerformanceTier | null;
    submittedAt: string | null;
  } | null;
  scores: { criteriaName: string; score: number }[] | null;
  companyAverage: number | null;
  feedback: string | null;
};

type MeResult =
  | { ok: true; data: MeReview }
  | { ok: false; status: number; error: string };

export async function getMyReview(
  cycleIdParam: string,
  userIdHeader: unknown,
): Promise<MeResult> {
  const userId = userIdFromHeader(userIdHeader);
  if (!userId) {
    return { ok: false, status: 401, error: "x-user-id must be a UUID" };
  }
  const cycleId = cycleIdFromParam(cycleIdParam) ?? cycleIdFromParam(
    "b1000000-0000-4000-8000-000000000001",
  );
  if (!cycleId) {
    return { ok: false, status: 400, error: "cycleId must be a UUID" };
  }

  const actor = await findUserRole(userId);
  if (!actor.ok) {
    if ("notFound" in actor) {
      return { ok: false, status: 404, error: "User not found" };
    }
    return { ok: false, status: 500, error: actor.error };
  }

  const cycle = await getCycleById(cycleId);
  if (!cycle.ok) {
    if ("notFound" in cycle) {
      return { ok: false, status: 404, error: "Cycle not found" };
    }
    return { ok: false, status: 500, error: cycle.error };
  }

  const published = cycle.data.status === "PUBLISHED";

  const { data: evaluation, error: evalError } = await supabase
    .from("evaluations")
    .select("id, status, total_raw_score, performance_tier, submitted_at, reviewer_id")
    .eq("cycle_id", cycleId)
    .eq("reviewee_id", userId)
    .maybeSingle();
  if (evalError) {
    return { ok: false, status: 500, error: evalError.message };
  }

  const status = evaluation ? String(evaluation.status) : null;
  const gate = employeeReviewGate(published, status);

  const empty: MeReview = {
    published,
    publishedAt: cycle.data.publishedAt,
    gate,
    cycleName: cycle.data.name,
    employeeName: actor.data.name,
    reviewer: null,
    evaluation: null,
    scores: null,
    companyAverage: null,
    feedback: null,
  };

  if (gate !== "visible" || !evaluation) {
    return { ok: true, data: empty };
  }

  const { data: scoreRows, error: scoreError } = await supabase
    .from("evaluation_scores")
    .select("criteria_name, score, feedback")
    .eq("evaluation_id", evaluation.id);
  if (scoreError) {
    return { ok: false, status: 500, error: scoreError.message };
  }

  const { data: submitted, error: avgError } = await supabase
    .from("evaluations")
    .select("total_raw_score")
    .eq("cycle_id", cycleId)
    .eq("status", "SUBMITTED");
  if (avgError) {
    return { ok: false, status: 500, error: avgError.message };
  }

  const reviewer = await findUserRole(String(evaluation.reviewer_id));
  const reviewerInfo =
    reviewer.ok
      ? { name: reviewer.data.name, department: reviewer.data.department }
      : null;

  const tierRaw = evaluation.performance_tier == null ? null : String(evaluation.performance_tier);
  const tier = TIERS.includes(tierRaw as PerformanceTier) ? (tierRaw as PerformanceTier) : null;

  return {
    ok: true,
    data: {
      published,
      publishedAt: cycle.data.publishedAt,
      gate,
      cycleName: cycle.data.name,
      employeeName: actor.data.name,
      reviewer: reviewerInfo,
      evaluation: {
        totalRawScore: Number(evaluation.total_raw_score),
        tier,
        submittedAt: evaluation.submitted_at == null ? null : String(evaluation.submitted_at),
      },
      scores: (scoreRows ?? []).map((row) => ({
        criteriaName: String(row.criteria_name),
        score: Number(row.score),
      })),
      companyAverage: companyAverage(
        (submitted ?? []).map((row) =>
          row.total_raw_score == null ? null : Number(row.total_raw_score),
        ),
      ),
      feedback: firstFeedback(
        (scoreRows ?? []).map((row) => ({
          feedback: row.feedback == null ? null : String(row.feedback),
        })),
      ),
    },
  };
}
