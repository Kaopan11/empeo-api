import type { SupabaseClient } from "@supabase/supabase-js";
import {
  draftEvaluationSchema,
  evaluationSchema,
  type EvaluationWriteInput,
} from "./evaluation-form";
import type { EvaluationWriteResponse } from "./types";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function evaluationIdFromParam(value: string): string | null {
  return UUID.test(value) ? value : null;
}

export function totalRawScore(technical: string, collaboration: string): number {
  return Math.round(((Number(technical) + Number(collaboration)) / 2) * 100) / 100;
}

export function scoreRows(
  evaluationId: string,
  technical: string,
  collaboration: string,
  feedback: string,
) {
  return [
    {
      evaluation_id: evaluationId,
      criteria_name: "Technical Execution",
      weight: 0.5,
      score: Number(technical),
      feedback,
    },
    {
      evaluation_id: evaluationId,
      criteria_name: "Collaboration",
      weight: 0.5,
      score: Number(collaboration),
      feedback,
    },
  ];
}

type WriteResult =
  | { ok: true; data: EvaluationWriteResponse }
  | { ok: false; status: number; error: string };

export async function writeEvaluation(
  supabase: SupabaseClient,
  idParam: string,
  body: unknown,
  mode: "save" | "submit",
): Promise<WriteResult> {
  const id = evaluationIdFromParam(idParam);
  if (!id) {
    return { ok: false, status: 400, error: "Evaluation id must be a UUID" };
  }

  const { data: evaluation, error: loadError } = await supabase
    .from("evaluations")
    .select("id, status, cycle_id, review_cycles ( status )")
    .eq("id", id)
    .maybeSingle();
  if (loadError) {
    return { ok: false, status: 500, error: loadError.message };
  }
  if (!evaluation) {
    return { ok: false, status: 404, error: "Evaluation not found" };
  }
  if (evaluation.status === "SUBMITTED") {
    return { ok: false, status: 409, error: "Evaluation already submitted" };
  }

  const rawCycle = evaluation.review_cycles as
    | { status: string }
    | { status: string }[]
    | null;
  const cycle = Array.isArray(rawCycle) ? rawCycle[0] : rawCycle;
  if (!cycle) {
    return { ok: false, status: 404, error: "Review cycle not found" };
  }
  if (cycle.status !== "IN_PROGRESS") {
    return { ok: false, status: 409, error: "Review cycle is not open" };
  }

  const schema = mode === "save" ? draftEvaluationSchema : evaluationSchema;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 400, error: "Invalid request body" };
  }
  const input: EvaluationWriteInput = parsed.data;

  const { error: deleteError } = await supabase
    .from("evaluation_scores")
    .delete()
    .eq("evaluation_id", id);
  if (deleteError) {
    return { ok: false, status: 500, error: deleteError.message };
  }

  const { error: insertError } = await supabase
    .from("evaluation_scores")
    .insert(scoreRows(id, input.technical, input.collaboration, input.feedback));
  if (insertError) {
    return { ok: false, status: 500, error: insertError.message };
  }

  const total = totalRawScore(input.technical, input.collaboration);
  const submittedAt = mode === "submit" ? new Date().toISOString() : null;
  const status = mode === "submit" ? "SUBMITTED" : "DRAFT";

  const { error: updateError } = await supabase
    .from("evaluations")
    .update({
      status,
      total_raw_score: total,
      submitted_at: submittedAt,
    })
    .eq("id", id);
  if (updateError) {
    return { ok: false, status: 500, error: updateError.message };
  }

  return {
    ok: true,
    data: {
      id,
      status,
      totalRawScore: total,
      submittedAt,
    },
  };
}
