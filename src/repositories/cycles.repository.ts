import { supabase } from "./supabase";

export type CycleRow = {
  id: string;
  name: string;
  status: string;
  publishedAt: string | null;
};

export async function getCycleById(
  id: string,
): Promise<{ ok: true; data: CycleRow } | { ok: false; notFound: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("review_cycles")
    .select("id, name, status, published_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, notFound: true };
  }
  return {
    ok: true,
    data: {
      id: String(data.id),
      name: String(data.name),
      status: String(data.status),
      publishedAt: data.published_at == null ? null : String(data.published_at),
    },
  };
}

export async function setCyclePublished(
  id: string,
  published: boolean,
): Promise<{ ok: true; data: CycleRow } | { ok: false; error: string }> {
  const update = published
    ? { status: "PUBLISHED", published_at: new Date().toISOString() }
    : { status: "IN_PROGRESS", published_at: null };
  const { data, error } = await supabase
    .from("review_cycles")
    .update(update)
    .eq("id", id)
    .select("id, name, status, published_at")
    .maybeSingle();
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Cycle not found" };
  }
  return {
    ok: true,
    data: {
      id: String(data.id),
      name: String(data.name),
      status: String(data.status),
      publishedAt: data.published_at == null ? null : String(data.published_at),
    },
  };
}

export async function findUserRole(
  id: string,
): Promise<
  | { ok: true; data: { id: string; role: string; name: string; department: string } }
  | { ok: false; notFound: true }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("users")
    .select("id, role, name, department")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, notFound: true };
  }
  return {
    ok: true,
    data: {
      id: String(data.id),
      role: String(data.role),
      name: String(data.name),
      department: String(data.department),
    },
  };
}
