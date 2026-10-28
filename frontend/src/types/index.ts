export type BranchEnum = "CSE" | "ECE" | "EE" | "ME" | "CIVIL" | "IT";
export type ApplicationStatusEnum = "APPLIED" | "SHORTLISTED" | "INTERVIEW" | "OFFER" | "REJECTED";
export type BulkTargetStatus = "SHORTLISTED" | "INTERVIEW" | "OFFER" | "REJECTED";
export type MatchBand = "STRONG" | "MODERATE" | "WEAK";
export type EmbeddingBackend = "sentence-transformers" | "tfidf";
export type CandidateScope = "applicants" | "all_students";
export type ErrorCode = "BAD_REQUEST" | "INVALID_FILE" | "NOT_ELIGIBLE" | "NOT_FOUND" | "DUPLICATE_APPLICATION" | "DUPLICATE_EMAIL" | "VALIDATION_ERROR" | "SEED_DISABLED" | "INTERNAL_ERROR";

export const BRANCHES: BranchEnum[] = ["CSE", "ECE", "EE", "ME", "CIVIL", "IT"];
export const STATUSES: ApplicationStatusEnum[] = ["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFER", "REJECTED"];
export const BULK_TARGET_STATUSES: BulkTargetStatus[] = ["SHORTLISTED", "INTERVIEW", "OFFER", "REJECTED"];

export interface Student {
  id: string;
  name: string;
  email: string;
  branch: BranchEnum;
  cgpa: number;
  resume_url: string | null;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  eligible_branches: BranchEnum[];
  min_cgpa: number;
}

export interface Application {
  id: string;
  student_id: string;
  job_id: string;
  status: ApplicationStatusEnum;
  applied_at: string;
}

export interface ApplicationWithJobOut extends Application {
  job: Job;
}

export interface EvaluationOut {
  student_id: string;
  job_id: string;
  match_score: number;
  match_band: MatchBand;
  feedback: string;
}

export interface CandidateOut extends Application {
  student: Student;
  evaluation: EvaluationOut;
}