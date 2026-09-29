import { scoreRows } from "../domain/evaluation-scores";
import type { EvaluationWriteInput } from "../types/evaluation-schema";
import { supabase } from "./supabase";

export interface EvaluationForWrite {
  id: string;
  status: string;
  cycle_id: string;
  cycleStatus: string;
}

export async function findEvaluationForWrite(
  id: string,
): Promise<
  | { ok: true; data: EvaluationForWrite }
  | { ok: false; error: string }
  | { ok: false; notFound: true }
> {
  const { data, error } = await supabase
    .from("evaluations")
    .select("id, status, cycle_id, review_cycles ( status )")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, notFound: true };
  }
  const rawCycle = data.review_cycles as
    | { status: string }
    | { status: string }[]
    | null;
  const cycle = Array.isArray(rawCycle) ? rawCycle[0] : rawCycle;
  if (!cycle) {
    return { ok: false, notFound: true };
  }
  return {
    ok: true,
    data: {
      id: data.id,
      status: data.status,
      cycle_id: data.cycle_id,
      cycleStatus: cycle.status,
    },
  };
}

export async function replaceEvaluationScores(
  evaluationId: string,
  input: EvaluationWriteInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: deleteError } = await supabase
    .from("evaluation_scores")
    .delete()
    .eq("evaluation_id", evaluationId);
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  const { error: insertError } = await supabase
    .from("evaluation_scores")
    .insert(
      scoreRows(
        evaluationId,
        input.technical,
        input.collaboration,
        input.feedback,
      ),
    );
  if (insertError) {
    return { ok: false, error: insertError.message };
  }
  return { ok: true };
}

export async function updateEvaluationStatus(
  evaluationId: string,
  update: {
    status: string;
    total_raw_score?: number | null;
    submitted_at: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("evaluations").update(update).eq("id", evaluationId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function listOverdueEvaluations(cycleId: string): Promise<
  | {
      ok: true;
      data: {
        id: string;
        totalRawScore: number | null;
        scores: { criteria_name: string; score: number; feedback: string | null }[];
      }[];
    }
  | { ok: false; error: string }
> {
  const { data: evaluations, error } = await supabase
    .from("evaluations")
    .select("id, total_raw_score")
    .eq("cycle_id", cycleId)
    .eq("status", "OVERDUE");
  if (error) {
    return { ok: false, error: error.message };
  }
  const rows = evaluations ?? [];
  if (rows.length === 0) {
    return { ok: true, data: [] };
  }
  const ids = rows.map((row) => String(row.id));
  const { data: scores, error: scoreError } = await supabase
    .from("evaluation_scores")
    .select("evaluation_id, criteria_name, score, feedback")
    .in("evaluation_id", ids);
  if (scoreError) {
    return { ok: false, error: scoreError.message };
  }
  const byEval = new Map<
    string,
    { criteria_name: string; score: number; feedback: string | null }[]
  >();
  for (const score of scores ?? []) {
    const id = String(score.evaluation_id);
    const list = byEval.get(id) ?? [];
    list.push({
      criteria_name: String(score.criteria_name),
      score: Number(score.score),
      feedback: score.feedback == null ? null : String(score.feedback),
    });
    byEval.set(id, list);
  }
  return {
    ok: true,
    data: rows.map((row) => ({
      id: String(row.id),
      totalRawScore: row.total_raw_score == null ? null : Number(row.total_raw_score),
      scores: byEval.get(String(row.id)) ?? [],
    })),
  };
}
