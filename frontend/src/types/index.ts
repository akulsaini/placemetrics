export type BranchEnum = "CSE" | "ECE" | "EE" | "ME" | "CIVIL" | "IT";
export type ApplicationStatusEnum = "APPLIED" | "SHORTLISTED" | "INTERVIEW" | "OFFER" | "REJECTED";
export type BulkTargetStatus = "SHORTLISTED" | "INTERVIEW" | "OFFER" | "REJECTED";
export type MatchBand = "STRONG" | "MODERATE" | "WEAK";
export type EmbeddingBackend = "sentence-transformers" | "tfidf";
export type CandidateScope = "applicants" | "all_students";
export type ErrorCode =
  | "BAD_REQUEST"
  | "INVALID_FILE"
  | "NOT_ELIGIBLE"
  | "NOT_FOUND"
  | "DUPLICATE_APPLICATION"
  | "DUPLICATE_EMAIL"
  | "VALIDATION_ERROR"
  | "SEED_DISABLED"
  | "INTERNAL_ERROR";

export const BRANCHES: BranchEnum[] = ["CSE", "ECE", "EE", "ME", "CIVIL", "IT"];
export const STATUSES: ApplicationStatusEnum[] = ["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFER", "REJECTED"];
export const BULK_TARGET_STATUSES: BulkTargetStatus[] = ["SHORTLISTED", "INTERVIEW", "OFFER", "REJECTED"];

export interface HealthOut {
  status: string;
  embedding_backend: EmbeddingBackend;
  students_count: number;
  jobs_count: number;
  applications_count: number;
}

export interface StudentCreate {
  name: string;
  email: string;
  branch: BranchEnum;
  cgpa: number;
  backlogs: number;
  graduation_year: number;
  skills: string[];
  resume_text?: string;
}

export interface StudentOut {
  id: number;
  name: string;
  email: string;
  branch: BranchEnum;
  cgpa: number;
  backlogs: number;
  graduation_year: number;
  skills: string[];
  resume_text: string;
  resume_filename: string | null;
  created_at: string;
}

export interface ResumeUploadOut {
  student: StudentOut;
  extracted_skills: string[];
  characters_extracted: number;
}

export interface JobCreate {
  title: string;
  company: string;
  location: string;
  package_lpa: number;
  min_cgpa: number;
  max_backlogs: number;
  allowed_branches: BranchEnum[];
  required_skills: string[];
  preferred_skills: string[];
  description: string;
}

export interface JobOut {
  id: number;
  title: string;
  company: string;
  location: string;
  package_lpa: number;
  min_cgpa: number;
  max_backlogs: number;
  allowed_branches: BranchEnum[];
  required_skills: string[];
  preferred_skills: string[];
  description: string;
  created_at: string;
}

export interface EligibilityBreakdown {
  is_eligible: boolean;
  cgpa_ok: boolean;
  backlogs_ok: boolean;
  branch_ok: boolean;
  reasons: string[];
}

export interface ScoreBreakdown {
  overall_score: number;
  semantic_score: number;
  required_skill_score: number;
  preferred_skill_score: number;
  cgpa_score: number;
  match_band: MatchBand;
  matched_required_skills: string[];
  missing_required_skills: string[];
  matched_preferred_skills: string[];
  missing_preferred_skills: string[];
}

export interface EvaluationOut {
  job_id: number;
  student_id: number;
  eligibility: EligibilityBreakdown;
  score: ScoreBreakdown;
  explanation: string;
}

export interface ApplicationCreate {
  student_id: number;
  job_id: number;
}

export interface ApplicationOut {
  id: number;
  student_id: number;
  job_id: number;
  status: ApplicationStatusEnum;
  overall_score: number;
  match_band: MatchBand;
  created_at: string;
  updated_at: string;
}

export interface ApplicationWithJobOut extends ApplicationOut {
  job: JobOut;
  evaluation: EvaluationOut;
}

export interface CandidateRow {
  student: StudentOut;
  evaluation: EvaluationOut;
  application: ApplicationOut | null;
}

export interface CandidatesOut {
  job: JobOut;
  total_candidates: number;
  eligible_count: number;
  strong_match_count: number;
  candidates: CandidateRow[];
}

export interface BulkStatusRequest {
  application_ids: number[];
  target_status: BulkTargetStatus;
}

export interface BulkStatusOut {
  updated_count: number;
  applications: ApplicationOut[];
}

export interface SeedOut {
  students_created: number;
  jobs_created: number;
  applications_created: number;
}

export interface ApiErrorPayload {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}