import { z } from "zod";
import { cycleIdFromParam, userIdFromHeader } from "../domain/ids";
import { findUserRole, getCycleById, setCyclePublished } from "../repositories/cycles.repository";

const bodySchema = z.object({
  published: z.boolean(),
});

type PublishResult =
  | {
      ok: true;
      data: { id: string; name: string; status: string; publishedAt: string | null };
    }
  | { ok: false; status: number; error: string };

export async function publishCycle(
  cycleIdParam: string,
  body: unknown,
  userIdHeader: unknown,
): Promise<PublishResult> {
  const userId = userIdFromHeader(userIdHeader);
  if (!userId) {
    return { ok: false, status: 401, error: "x-user-id must be a UUID" };
  }
  const actor = await findUserRole(userId);
  if (!actor.ok) {
    if ("notFound" in actor) {
      return { ok: false, status: 401, error: "Unknown user" };
    }
    return { ok: false, status: 500, error: actor.error };
  }
  if (actor.data.role !== "HR") {
    return { ok: false, status: 403, error: "Only HR can publish a cycle" };
  }

  const cycleId = cycleIdFromParam(cycleIdParam);
  if (!cycleId) {
    return { ok: false, status: 400, error: "cycleId must be a UUID" };
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 400, error: "published must be a boolean" };
  }

  const existing = await getCycleById(cycleId);
  if (!existing.ok) {
    if ("notFound" in existing) {
      return { ok: false, status: 404, error: "Cycle not found" };
    }
    return { ok: false, status: 500, error: existing.error };
  }

  const updated = await setCyclePublished(cycleId, parsed.data.published);
  if (!updated.ok) {
    return { ok: false, status: 500, error: updated.error };
  }
  return { ok: true, data: updated.data };
}
