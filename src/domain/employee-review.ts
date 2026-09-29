import { populationMean } from "./fairness";

export type EmployeeReviewGate = "waiting_publish" | "waiting_submit" | "visible";

export function employeeReviewGate(
  published: boolean,
  evaluationStatus: string | null,
): EmployeeReviewGate {
  if (!published) {
    return "waiting_publish";
  }
  if (evaluationStatus !== "SUBMITTED") {
    return "waiting_submit";
  }
  return "visible";
}

export function firstFeedback(
  scores: { feedback: string | null }[],
): string | null {
  for (const row of scores) {
    const text = row.feedback?.trim();
    if (text) {
      return text;
    }
  }
  return null;
}

export function companyAverage(rawScores: (number | null)[]): number | null {
  const values = rawScores.filter((score): score is number => score != null);
  const mean = populationMean(values);
  return mean == null ? null : Math.round(mean * 100) / 100;
}
