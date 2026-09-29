import { buildDashboard } from "../domain/dashboard";
import { cycleIdFromParam } from "../domain/ids";
import { loadCycleDashboard } from "../repositories/dashboard.repository";

type DashboardResult =
  | { ok: true; data: ReturnType<typeof buildDashboard> }
  | { ok: false; status: number; error: string };

export async function getCycleDashboard(cycleIdParam: string): Promise<DashboardResult> {
  const cycleId = cycleIdFromParam(cycleIdParam);
  if (!cycleId) {
    return { ok: false, status: 400, error: "cycleId must be a UUID" };
  }

  const loaded = await loadCycleDashboard(cycleId);
  if (!loaded.ok) {
    if ("notFound" in loaded) {
      return { ok: false, status: 404, error: "Cycle not found" };
    }
    return { ok: false, status: 500, error: loaded.error };
  }

  return {
    ok: true,
    data: buildDashboard({ ...loaded.data, now: new Date() }),
  };
}
