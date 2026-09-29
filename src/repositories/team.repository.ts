import type { EvaluationRow, ReportRow } from "../domain/team";
import { supabase } from "./supabase";

export async function findUserById(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string } | { ok: false; notFound: true }> {
  const { data, error } = await supabase.from("users").select("id").eq("id", id).maybeSingle();
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, notFound: true };
  }
  return { ok: true };
}

export async function findOpenCycles(): Promise<
  | { ok: true; data: { id: string; name: string }[] }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("review_cycles")
    .select("id, name")
    .in("status", ["IN_PROGRESS", "PUBLISHED"])
    .overrideTypes<{ id: string; name: string }[], { merge: false }>();
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data ?? [] };
}

export async function findDirectReports(
  managerId: string,
): Promise<{ ok: true; data: ReportRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, department")
    .eq("manager_id", managerId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []) as ReportRow[] };
}

export async function findManagerEvaluations(
  cycleId: string,
  managerId: string,
): Promise<{ ok: true; data: EvaluationRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("evaluations")
    .select("id, reviewee_id, status")
    .eq("cycle_id", cycleId)
    .eq("reviewer_id", managerId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []) as EvaluationRow[] };
}
