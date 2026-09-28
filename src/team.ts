import type { EvaluationStatus, TeamMember } from "./types";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TEAM_STATUSES: EvaluationStatus[] = [
  "PENDING",
  "DRAFT",
  "SUBMITTED",
  "OVERDUE",
];

export function managerIdFromQuery(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

export interface ReportRow {
  id: string;
  name: string;
  email: string;
  department: string;
}

export interface EvaluationRow {
  id: string;
  reviewee_id: string;
  status: string;
}

function isTeamStatus(status: string): status is EvaluationStatus {
  return (TEAM_STATUSES as string[]).includes(status);
}

export function buildTeamMembers(
  reports: ReportRow[],
  evaluations: EvaluationRow[],
): { ok: true; members: TeamMember[] } | { ok: false; error: string } {
  const byReviewee = new Map<string, EvaluationRow[]>();
  for (const evaluation of evaluations) {
    const rows = byReviewee.get(evaluation.reviewee_id) ?? [];
    rows.push(evaluation);
    byReviewee.set(evaluation.reviewee_id, rows);
  }

  const members: TeamMember[] = [];
  for (const report of [...reports].sort((a, b) => a.name.localeCompare(b.name))) {
    const rows = byReviewee.get(report.id) ?? [];
    if (rows.length > 1) {
      return { ok: false, error: `Multiple evaluations for ${report.id}` };
    }
    const row = rows[0];
    if (!row) {
      return {
        ok: false,
        error: `Missing evaluation for direct report ${report.id}`,
      };
    }
    if (!isTeamStatus(row.status)) {
      return { ok: false, error: `Unexpected evaluation status for ${report.id}` };
    }
    members.push({
      userId: report.id,
      name: report.name,
      email: report.email,
      department: report.department,
      evaluationId: row.id,
      status: row.status,
    });
  }

  return { ok: true, members };
}
