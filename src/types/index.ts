export interface Employee {
  id: string;
  full_name: string;
  email: string;
  department: string;
}

export type EvaluationStatus = "PENDING" | "DRAFT" | "SUBMITTED" | "OVERDUE";

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  department: string;
  evaluationId: string | null;
  status: EvaluationStatus;
}

export interface TeamEvaluations {
  cycle: { id: string; name: string };
  members: TeamMember[];
}

export interface EvaluationWriteBody {
  technical: string;
  collaboration: string;
  feedback: string;
}

export interface EvaluationWriteResponse {
  id: string;
  status: "DRAFT" | "SUBMITTED";
  totalRawScore: number;
  submittedAt: string | null;
}

export interface Review {
  id: string;
  employee_id: string;
  reviewer_id: string;
  cycle: string;
  score: number;
  comment: string;
  created_at: string;
}
