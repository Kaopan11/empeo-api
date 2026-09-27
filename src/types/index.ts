export interface Employee {
  id: string;
  full_name: string;
  email: string;
  department: string;
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
