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
    total_raw_score: number;
    submitted_at: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("evaluations").update(update).eq("id", evaluationId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
