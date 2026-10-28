import { initialStudents, initialJobs, initialApplications } from './mockData';
import { Student, Job, Application, ApplicationWithJobOut, CandidateOut, EvaluationOut } from '../types';

const getStorage = <T>(key: string, initial: T): T => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
};

const setStorage = <T>(key: string, data: T) => localStorage.setItem(key, JSON.stringify(data));

export const mockServer = {
  getStudents: () => getStorage<Student[]>('students', initialStudents),
  getStudent: (id: string) => mockServer.getStudents().find(s => s.id === id),
  getJobs: () => getStorage<Job[]>('jobs', initialJobs),
  getJob: (id: string) => mockServer.getJobs().find(j => j.id === id),
  createJob: (job: Omit<Job, 'id'>) => {
    const jobs = mockServer.getJobs();
    const newJob = { ...job, id: `j${Date.now()}` };
    setStorage('jobs', [...jobs, newJob]);
    return newJob;
  },
  getApplications: () => getStorage<Application[]>('applications', initialApplications),
  applyToJob: (student_id: string, job_id: string) => {
    const apps = mockServer.getApplications();
    const newApp: Application = { id: `a${Date.now()}`, student_id, job_id, status: "APPLIED", applied_at: new Date().toISOString() };
    setStorage('applications', [...apps, newApp]);
    return newApp;
  },
  getStudentApplications: (student_id: string): ApplicationWithJobOut[] => {
    const apps = mockServer.getApplications().filter(a => a.student_id === student_id);
    const jobs = mockServer.getJobs();
    return apps.map(app => ({ ...app, job: jobs.find(j => j.id === app.job_id)! }));
  },
  getJobCandidates: (job_id: string): CandidateOut[] => {
    const apps = mockServer.getApplications().filter(a => a.job_id === job_id);
    const students = mockServer.getStudents();
    return apps.map(app => {
      const student = students.find(s => s.id === app.student_id)!;
      return {
        ...app,
        student,
        evaluation: { student_id: student.id, job_id, match_score: 85, match_band: "STRONG", feedback: "Good fit" }
      };
    });
  },
  evaluate: (job_id: string, student_id: string): EvaluationOut => ({
    student_id, job_id, match_score: Math.floor(Math.random() * 40) + 60, match_band: "MODERATE", feedback: "Mock feedback generated."
  }),
  bulkStatusUpdate: (job_id: string, student_ids: string[], status: string) => {
    const apps = mockServer.getApplications();
    const updated = apps.map(app => 
      (app.job_id === job_id && student_ids.includes(app.student_id)) ? { ...app, status: status as any } : app
    );
    setStorage('applications', updated);
    return { success: true, updated_count: student_ids.length };
  }
};