import { Student, Job, Application } from '../types/index';

export const initialStudents: Student[] = [
  { id: "s1", name: "Alice Sharma", email: "alice@example.com", branch: "CSE", cgpa: 9.2, resume_url: null },
  { id: "s2", name: "Bob Verma", email: "bob@example.com", branch: "ECE", cgpa: 8.5, resume_url: null }
];

export const initialJobs: Job[] = [
  { id: "j1", title: "Software Engineer", company: "TechCorp", description: "Backend role", eligible_branches: ["CSE", "IT"], min_cgpa: 8.0 },
  { id: "j2", title: "Data Analyst", company: "DataSync", description: "Data science role", eligible_branches: ["CSE", "ECE", "EE"], min_cgpa: 7.5 }
];

export const initialApplications: Application[] = [
  { id: "a1", student_id: "s1", job_id: "j1", status: "APPLIED", applied_at: new Date().toISOString() }
];