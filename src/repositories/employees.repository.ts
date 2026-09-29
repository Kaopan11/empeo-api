import type { Employee } from "../types";
import { supabase } from "./supabase";

export async function listEmployees(): Promise<
  { ok: true; data: Employee[] } | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("employees")
    .select("id, full_name, email, department")
    .overrideTypes<Employee[], { merge: false }>();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data ?? [] };
}
