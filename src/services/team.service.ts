import { buildTeamMembers } from "../domain/team";
import { managerIdFromQuery } from "../domain/ids";
import {
  findDirectReports,
  findInProgressCycles,
  findManagerEvaluations,
  findUserById,
} from "../repositories/team.repository";
import type { TeamEvaluations } from "../types";

type TeamResult =
  | { ok: true; data: TeamEvaluations }
  | { ok: false; status: number; error: string };

export async function getTeamEvaluations(
  managerIdParam: unknown,
): Promise<TeamResult> {
  const managerId = managerIdFromQuery(managerIdParam);
  if (!managerId) {
    return { ok: false, status: 400, error: "managerId must be a UUID" };
  }

  const manager = await findUserById(managerId);
  if (!manager.ok) {
    if ("notFound" in manager) {
      return { ok: false, status: 404, error: "Manager not found" };
    }
    return { ok: false, status: 500, error: manager.error };
  }

  const cycles = await findInProgressCycles();
  if (!cycles.ok) {
    return { ok: false, status: 500, error: cycles.error };
  }
  if (cycles.data.length !== 1) {
    return {
      ok: false,
      status: 409,
      error: "Expected exactly one in-progress review cycle",
    };
  }
  const cycle = cycles.data[0];
  if (!cycle) {
    return {
      ok: false,
      status: 409,
      error: "Expected exactly one in-progress review cycle",
    };
  }

  const reports = await findDirectReports(managerId);
  if (!reports.ok) {
    return { ok: false, status: 500, error: reports.error };
  }

  const evaluations = await findManagerEvaluations(cycle.id, managerId);
  if (!evaluations.ok) {
    return { ok: false, status: 500, error: evaluations.error };
  }

  const built = buildTeamMembers(reports.data, evaluations.data);
  if (!built.ok) {
    return { ok: false, status: 500, error: built.error };
  }

  return {
    ok: true,
    data: {
      cycle: { id: cycle.id, name: cycle.name },
      members: built.members,
    },
  };
}
