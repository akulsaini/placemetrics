import axios, { AxiosError } from "axios";
import type {
  ApplicationCreate,
  ApplicationOut,
  ApplicationWithJobOut,
  BulkStatusOut,
  BulkStatusRequest,
  CandidateScope,
  CandidatesOut,
  EvaluationOut,
  HealthOut,
  JobCreate,
  JobOut,
  ResumeUploadOut,
  SeedOut,
  StudentCreate,
  StudentOut
} from "../types";
import { mockServer } from "./mockServer";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
const FORCE_MOCK = String(import.meta.env.VITE_USE_MOCK).toLowerCase() === "true";

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 6000
});

let usingMockFallback = FORCE_MOCK;

export function isUsingMockMode(): boolean {
  return usingMockFallback;
}

export function setMockMode(enabled: boolean): void {
  usingMockFallback = enabled;
}

function isNetworkOrServerDown(err: unknown): boolean {
  if (FORCE_MOCK || usingMockFallback) return true;
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError;
    if (!axiosErr.response) {
      usingMockFallback = true;
      return true;
    }
  }
  return false;
}

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown> | undefined;
    if (data) {
      if (typeof data.message === "string") return data.message;
      if (typeof data.detail === "string") return data.detail;
      if (typeof data.error === "object" && data.error !== null) {
        const nested = data.error as Record<string, unknown>;
        if (typeof nested.message === "string") return nested.message;
      }
    }
    return err.message || "Network error occurred.";
  }
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "An unexpected error occurred.";
}

export const apiClient = {
  async getHealth(): Promise<HealthOut> {
    if (FORCE_MOCK || usingMockFallback) return mockServer.getHealth();
    try {
      const { data } = await http.get<HealthOut>("/health");
      return data;
    } catch (err) {
      if (isNetworkOrServerDown(err)) return mockServer.getHealth();
      throw err;
    }
  },

  async getStudents(): Promise<StudentOut[]> {
    if (FORCE_MOCK || usingMockFallback) return mockServer.getStudents();
    try {
      const { data } = await http.get<StudentOut[]>("/students");
      return data;
    } catch (err) {
      if (isNetworkOrServerDown(err)) return mockServer.getStudents();
      throw err;
    }
  },

  async getStudent(studentId: number): Promise<StudentOut> {
    if (FORCE_MOCK || usingMockFallback) return mockServer.getStudent(studentId);
    try {
      const { data } = await http.get<StudentOut>(`/students/${studentId}`);
      return data;
    } catch (err) {
      if (isNetworkOrServerDown(err)) return mockServer.getStudent(studentId);
      throw err;
    }
  },

  async createStudent(payload: StudentCreate): Promise<StudentOut> {
    if (FORCE_MOCK || usingMockFallback) return mockServer.createStudent(payload);
    try {
      const { data } = await http.post<StudentOut>("/students", payload);
      return data;
    } catch (err) {
      if (isNetworkOrServerDown(err)) return mockServer.createStudent(payload);
      throw err;
    }
  },

  async uploadResume(studentId: number, file: File): Promise<ResumeUploadOut> {
    if (FORCE_MOCK || usingMockFallback) return mockServer.uploadResume(studentId, file);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await http.post<ResumeUploadOut>(
        `/students/${studentId}/resume`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data;
    } catch (err) {
      if (isNetworkOrServerDown(err)) return mockServer.uploadResume(studentId, file);
      throw err;
    }
  },

  async getJobs(): Promise<JobOut[]> {
    if (FORCE_MOCK || usingMockFallback) return mockServer.getJobs();
    try {
      const { data } = await http.get<JobOut[]>("/jobs");
      return data;
    } catch (err) {
      if (isNetworkOrServerDown(err)) return mockServer.getJobs();
      throw err;
    }
  },

  async createJob(payload: JobCreate): Promise<JobOut> {
    if (FORCE_MOCK || usingMockFallback) return mockServer.createJob(payload);
    try {
      const { data } = await http.post<JobOut>("/jobs", payload);
      return data;
    } catch (err) {
      if (isNetworkOrServerDown(err)) return mockServer.createJob(payload);
      throw err;
    }
  },

  async evaluateJobForStudent(jobId: number, studentId: number): Promise<EvaluationOut> {
    if (FORCE_MOCK || usingMockFallback) return mockServer.evaluate(jobId, studentId);
    try {
      const { data } = await http.get<EvaluationOut>(`/jobs/${jobId}/evaluate/${studentId}`);
      return data;
    } catch (err) {
      if (isNetworkOrServerDown(err)) return mockServer.evaluate(jobId, studentId);
      throw err;
    }
  },

  async createApplication(payload: ApplicationCreate): Promise<ApplicationOut> {
    if (FORCE_MOCK || usingMockFallback) return mockServer.createApplication(payload);
    try {
      const { data } = await http.post<ApplicationOut>("/applications", payload);
      return data;
    } catch (err) {
      if (isNetworkOrServerDown(err)) return mockServer.createApplication(payload);
      throw err;
    }
  },

  async getStudentApplications(studentId: number): Promise<ApplicationWithJobOut[]> {
    if (FORCE_MOCK || usingMockFallback) return mockServer.getStudentApplications(studentId);
    try {
      const { data } = await http.get<ApplicationWithJobOut[]>(
        `/applications/student/${studentId}`
      );
      return data;
    } catch (err) {
      if (isNetworkOrServerDown(err)) return mockServer.getStudentApplications(studentId);
      throw err;
    }
  },

  async getJobCandidates(jobId: number, scope: CandidateScope = "applicants"): Promise<CandidatesOut> {
    if (FORCE_MOCK || usingMockFallback) return mockServer.getJobCandidates(jobId, scope);
    try {
      const { data } = await http.get<CandidatesOut>(`/jobs/${jobId}/candidates`, {
        params: { scope }
      });
      return data;
    } catch (err) {
      if (isNetworkOrServerDown(err)) return mockServer.getJobCandidates(jobId, scope);
      throw err;
    }
  },

  async bulkUpdateApplicationStatus(payload: BulkStatusRequest): Promise<BulkStatusOut> {
    if (FORCE_MOCK || usingMockFallback) return mockServer.bulkUpdateStatus(payload);
    try {
      const { data } = await http.patch<BulkStatusOut>("/applications/bulk-status", payload);
      return data;
    } catch (err) {
      if (isNetworkOrServerDown(err)) return mockServer.bulkUpdateStatus(payload);
      throw err;
    }
  },

  async seedData(): Promise<SeedOut> {
    if (FORCE_MOCK || usingMockFallback) return mockServer.seedDemoData();
    try {
      const { data } = await http.post<SeedOut>("/seed");
      return data;
    } catch (err) {
      if (isNetworkOrServerDown(err)) return mockServer.seedDemoData();
      throw err;
    }
  }
};