import { cycleIdFromParam } from "../domain/ids";
import { listManagerCycleMetrics } from "../repositories/fairness.repository";

type MetricsResult =
  | {
      ok: true;
      data: {
        cycleId: string;
        managers: {
          managerId: string;
          biasIndex: number | null;
          updatedAt: string;
        }[];
      };
    }
  | { ok: false; status: number; error: string };

export async function getManagerCycleMetrics(
  cycleIdParam: string,
): Promise<MetricsResult> {
  const cycleId = cycleIdFromParam(cycleIdParam);
  if (!cycleId) {
    return { ok: false, status: 400, error: "cycleId must be a UUID" };
  }

  const listed = await listManagerCycleMetrics(cycleId);
  if (!listed.ok) {
    return { ok: false, status: 500, error: listed.error };
  }

  return {
    ok: true,
    data: {
      cycleId,
      managers: listed.data.map((row) => ({
        managerId: row.manager_id,
        biasIndex: row.bias_index,
        updatedAt: row.updated_at,
      })),
    },
  };
}
