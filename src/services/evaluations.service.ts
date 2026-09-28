import { totalRawScore } from "../domain/evaluation-scores";
import { evaluationIdFromParam } from "../domain/ids";
import {
  findEvaluationForWrite,
  replaceEvaluationScores,
  updateEvaluationStatus,
} from "../repositories/evaluations.repository";
import { persistFairnessForCycle } from "../repositories/fairness.repository";
import {
  draftEvaluationSchema,
  evaluationSchema,
  type EvaluationWriteInput,
} from "../types/evaluation-schema";
import type { EvaluationWriteResponse } from "../types";

type WriteResult =
  | { ok: true; data: EvaluationWriteResponse }
  | { ok: false; status: number; error: string };

export async function writeEvaluation(
  idParam: string,
  body: unknown,
  mode: "save" | "submit",
): Promise<WriteResult> {
  const id = evaluationIdFromParam(idParam);
  if (!id) {
    return { ok: false, status: 400, error: "Evaluation id must be a UUID" };
  }

  const loaded = await findEvaluationForWrite(id);
  if (!loaded.ok) {
    if ("notFound" in loaded) {
      return { ok: false, status: 404, error: "Evaluation not found" };
    }
    return { ok: false, status: 500, error: loaded.error };
  }
  const evaluation = loaded.data;

  if (evaluation.status === "SUBMITTED") {
    return { ok: false, status: 409, error: "Evaluation already submitted" };
  }
  if (evaluation.status === "OVERDUE") {
    return {
      ok: false,
      status: 409,
      error: "Evaluation is overdue; contact HR",
    };
  }
  if (evaluation.status !== "PENDING" && evaluation.status !== "DRAFT") {
    return { ok: false, status: 500, error: "Unexpected evaluation status" };
  }
  if (evaluation.cycleStatus !== "IN_PROGRESS") {
    return { ok: false, status: 409, error: "Review cycle is not open" };
  }

  const schema = mode === "save" ? draftEvaluationSchema : evaluationSchema;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 400, error: "Invalid request body" };
  }
  const input: EvaluationWriteInput = parsed.data;

  const scores = await replaceEvaluationScores(id, input);
  if (!scores.ok) {
    return { ok: false, status: 500, error: scores.error };
  }

  const total = totalRawScore(input.technical, input.collaboration);
  const submittedAt = mode === "submit" ? new Date().toISOString() : null;
  const status = mode === "submit" ? "SUBMITTED" : "DRAFT";

  const updated = await updateEvaluationStatus(id, {
    status,
    total_raw_score: total,
    submitted_at: submittedAt,
  });
  if (!updated.ok) {
    return { ok: false, status: 500, error: updated.error };
  }

  if (mode === "submit") {
    const fairness = await persistFairnessForCycle(evaluation.cycle_id);
    if (!fairness.ok) {
      return { ok: false, status: 500, error: fairness.error };
    }
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
