import type {
  ApplicationCreate,
  ApplicationOut,
  ApplicationWithJobOut,
  BulkStatusOut,
  BulkStatusRequest,
  CandidateRow,
  CandidateScope,
  CandidatesOut,
  EligibilityBreakdown,
  EvaluationOut,
  HealthOut,
  JobCreate,
  JobOut,
  MatchBand,
  ResumeUploadOut,
  ScoreBreakdown,
  SeedOut,
  StudentCreate,
  StudentOut
} from "../types";
import { INITIAL_APPLICATIONS, INITIAL_JOBS, INITIAL_STUDENTS } from "./mockData";

const STORAGE_KEYS = {
  STUDENTS: "placemetrics_mock_students_v1",
  JOBS: "placemetrics_mock_jobs_v1",
  APPLICATIONS: "placemetrics_mock_applications_v1"
};

const KNOWN_SKILLS_DICTIONARY = [
  "Python",
  "TypeScript",
  "JavaScript",
  "React",
  "FastAPI",
  "Node.js",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "PyTorch",
  "TensorFlow",
  "NLP",
  "Java",
  "Spring Boot",
  "Kafka",
  "C++",
  "SQL",
  "Tableau",
  "PowerBI",
  "Excel",
  "Git",
  "Linux",
  "Go",
  "Rust",
  "GraphQL"
];

function loadList<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return [...fallback];
    }
    return JSON.parse(raw) as T[];
  } catch {
    return [...fallback];
  }
}

function saveList<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}

function normalizeSkill(s: string): string {
  return s.trim().toLowerCase();
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
}

export function evaluateStudentForJob(student: StudentOut, job: JobOut): EvaluationOut {
  const cgpa_ok = student.cgpa >= job.min_cgpa;
  const backlogs_ok = student.backlogs <= job.max_backlogs;
  const branch_ok = job.allowed_branches.includes(student.branch);
  const reasons: string[] = [];

  if (!cgpa_ok) {
    reasons.push(`CGPA ${student.cgpa.toFixed(2)} is below minimum required ${job.min_cgpa.toFixed(2)}`);
  }
  if (!backlogs_ok) {
    reasons.push(`Active backlogs (${student.backlogs}) exceed maximum allowed (${job.max_backlogs})`);
  }
  if (!branch_ok) {
    reasons.push(`Branch ${student.branch} is not in allowed branches (${job.allowed_branches.join(", ")})`);
  }

  const eligibility: EligibilityBreakdown = {
    is_eligible: cgpa_ok && backlogs_ok && branch_ok,
    cgpa_ok,
    backlogs_ok,
    branch_ok,
    reasons
  };

  const studentSkillSet = new Set(student.skills.map(normalizeSkill));
  const resumeLower = (student.resume_text || "").toLowerCase();

  const hasSkill = (skill: string): boolean => {
    const norm = normalizeSkill(skill);
    return studentSkillSet.has(norm) || resumeLower.includes(norm);
  };

  const matched_required_skills = job.required_skills.filter(hasSkill);
  const missing_required_skills = job.required_skills.filter((s) => !hasSkill(s));
  const matched_preferred_skills = job.preferred_skills.filter(hasSkill);
  const missing_preferred_skills = job.preferred_skills.filter((s) => !hasSkill(s));

  const required_skill_score =
    job.required_skills.length > 0
      ? Number(((matched_required_skills.length / job.required_skills.length) * 100).toFixed(1))
      : 100;

  const preferred_skill_score =
    job.preferred_skills.length > 0
      ? Number(((matched_preferred_skills.length / job.preferred_skills.length) * 100).toFixed(1))
      : 100;

  const studentCorpus = `${student.skills.join(" ")} ${student.resume_text} ${student.branch}`;
  const jobCorpus = `${job.title} ${job.description} ${job.required_skills.join(" ")} ${job.preferred_skills.join(" ")}`;
  const sTokens = tokenize(studentCorpus);
  const jTokens = tokenize(jobCorpus);

  let overlap = 0;
  jTokens.forEach((tok) => {
    if (sTokens.has(tok)) overlap += 1;
  });

  const rawSemantic = jTokens.size > 0 ? (overlap / jTokens.size) * 100 : 50;
  const semantic_score = Number(Math.min(100, Math.max(25, rawSemantic * 1.45)).toFixed(1));
  const cgpa_score = Number(Math.min(100, (student.cgpa / 10.0) * 100).toFixed(1));

  const overall_score = Number(
    (
      required_skill_score * 0.45 +
      semantic_score * 0.25 +
      preferred_skill_score * 0.15 +
      cgpa_score * 0.15
    ).toFixed(1)
  );

  let match_band: MatchBand = "WEAK";
  if (overall_score >= 75) {
    match_band = "STRONG";
  } else if (overall_score >= 50) {
    match_band = "MODERATE";
  }

  const score: ScoreBreakdown = {
    overall_score,
    semantic_score,
    required_skill_score,
    preferred_skill_score,
    cgpa_score,
    match_band,
    matched_required_skills,
    missing_required_skills,
    matched_preferred_skills,
    missing_preferred_skills
  };

  const explanationParts: string[] = [];
  if (eligibility.is_eligible) {
    explanationParts.push(`Meets all academic criteria (${student.branch}, ${student.cgpa} CGPA).`);
  } else {
    explanationParts.push(`Ineligible: ${reasons.join("; ")}.`);
  }
  explanationParts.push(
    `Matched ${matched_required_skills.length}/${job.required_skills.length} required skills and ${matched_preferred_skills.length}/${job.preferred_skills.length} preferred skills (${overall_score}% overall fit).`
  );

  return {
    job_id: job.id,
    student_id: student.id,
    eligibility,
    score,
    explanation: explanationParts.join(" ")
  };
}

export const mockServer = {
  getHealth(): HealthOut {
    const students = loadList(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const jobs = loadList(STORAGE_KEYS.JOBS, INITIAL_JOBS);
    const applications = loadList(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
    return {
      status: "ok",
      embedding_backend: "tfidf",
      students_count: students.length,
      jobs_count: jobs.length,
      applications_count: applications.length
    };
  },

  getStudents(): StudentOut[] {
    return loadList(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  },

  getStudent(studentId: number): StudentOut {
    const students = loadList(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const found = students.find((s) => s.id === studentId);
    if (!found) {
      throw { code: "NOT_FOUND", message: `Student #${studentId} not found.` };
    }
    return found;
  },

  createStudent(payload: StudentCreate): StudentOut {
    const students = loadList(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const exists = students.some((s) => s.email.toLowerCase() === payload.email.trim().toLowerCase());
    if (exists) {
      throw { code: "DUPLICATE_EMAIL", message: `A student with email ${payload.email} already exists.` };
    }
    const nextId = students.reduce((max, s) => Math.max(max, s.id), 0) + 1;
    const newStudent: StudentOut = {
      id: nextId,
      name: payload.name.trim(),
      email: payload.email.trim(),
      branch: payload.branch,
      cgpa: Number(payload.cgpa),
      backlogs: Number(payload.backlogs),
      graduation_year: Number(payload.graduation_year),
      skills: payload.skills.map((s) => s.trim()).filter(Boolean),
      resume_text: payload.resume_text?.trim() || "",
      resume_filename: null,
      created_at: new Date().toISOString()
    };
    const updated = [newStudent, ...students];
    saveList(STORAGE_KEYS.STUDENTS, updated);
    return newStudent;
  },

  async uploadResume(studentId: number, file: File): Promise<ResumeUploadOut> {
    const students = loadList(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const idx = students.findIndex((s) => s.id === studentId);
    if (idx === -1) {
      throw { code: "NOT_FOUND", message: `Student #${studentId} not found.` };
    }

    let extractedText = "";
    try {
      extractedText = await file.text();
      // Clean non-printable characters if binary PDF uploaded in mock mode
      extractedText = extractedText.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
    } catch {
      extractedText = "";
    }

    if (extractedText.length < 30) {
      extractedText = `Resume uploaded from ${file.name}. Experienced in Python, TypeScript, React, SQL, FastAPI, Docker, and cloud engineering projects.`;
    }

    const lowerText = extractedText.toLowerCase();
    const extractedSkills = KNOWN_SKILLS_DICTIONARY.filter((skill) =>
      lowerText.includes(skill.toLowerCase())
    );

    const mergedSkills = Array.from(new Set([...students[idx].skills, ...extractedSkills]));
    const updatedStudent: StudentOut = {
      ...students[idx],
      skills: mergedSkills,
      resume_text: extractedText.slice(0, 4000),
      resume_filename: file.name
    };

    students[idx] = updatedStudent;
    saveList(STORAGE_KEYS.STUDENTS, students);

    return {
      student: updatedStudent,
      extracted_skills: extractedSkills,
      characters_extracted: updatedStudent.resume_text.length
    };
  },

  getJobs(): JobOut[] {
    return loadList(STORAGE_KEYS.JOBS, INITIAL_JOBS);
  },

  createJob(payload: JobCreate): JobOut {
    const jobs = loadList(STORAGE_KEYS.JOBS, INITIAL_JOBS);
    const nextId = jobs.reduce((max, j) => Math.max(max, j.id), 0) + 1;
    const newJob: JobOut = {
      id: nextId,
      title: payload.title.trim(),
      company: payload.company.trim(),
      location: payload.location.trim(),
      package_lpa: Number(payload.package_lpa),
      min_cgpa: Number(payload.min_cgpa),
      max_backlogs: Number(payload.max_backlogs),
      allowed_branches: payload.allowed_branches,
      required_skills: payload.required_skills.map((s) => s.trim()).filter(Boolean),
      preferred_skills: payload.preferred_skills.map((s) => s.trim()).filter(Boolean),
      description: payload.description.trim(),
      created_at: new Date().toISOString()
    };
    const updated = [newJob, ...jobs];
    saveList(STORAGE_KEYS.JOBS, updated);
    return newJob;
  },

  evaluate(jobId: number, studentId: number): EvaluationOut {
    const student = this.getStudent(studentId);
    const jobs = loadList(STORAGE_KEYS.JOBS, INITIAL_JOBS);
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      throw { code: "NOT_FOUND", message: `Job #${jobId} not found.` };
    }
    return evaluateStudentForJob(student, job);
  },

  createApplication(payload: ApplicationCreate): ApplicationOut {
    const applications = loadList(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
    const duplicate = applications.find(
      (a) => a.student_id === payload.student_id && a.job_id === payload.job_id
    );
    if (duplicate) {
      throw {
        code: "DUPLICATE_APPLICATION",
        message: "Student has already applied to this job opening."
      };
    }

    const evaluation = this.evaluate(payload.job_id, payload.student_id);
    if (!evaluation.eligibility.is_eligible) {
      throw {
        code: "NOT_ELIGIBLE",
        message: evaluation.eligibility.reasons.join("; ") || "Student does not meet eligibility criteria."
      };
    }

    const nextId = applications.reduce((max, a) => Math.max(max, a.id), 0) + 1;
    const now = new Date().toISOString();
    const newApp: ApplicationOut = {
      id: nextId,
      student_id: payload.student_id,
      job_id: payload.job_id,
      status: "APPLIED",
      overall_score: evaluation.score.overall_score,
      match_band: evaluation.score.match_band,
      created_at: now,
      updated_at: now
    };

    const updated = [newApp, ...applications];
    saveList(STORAGE_KEYS.APPLICATIONS, updated);
    return newApp;
  },

  getStudentApplications(studentId: number): ApplicationWithJobOut[] {
    this.getStudent(studentId);
    const applications = loadList(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
    const jobs = loadList(STORAGE_KEYS.JOBS, INITIAL_JOBS);

    return applications
      .filter((a) => a.student_id === studentId)
      .map((app) => {
        const job = jobs.find((j) => j.id === app.job_id) || jobs[0];
        const evaluation = this.evaluate(job.id, studentId);
        return {
          ...app,
          overall_score: evaluation.score.overall_score,
          match_band: evaluation.score.match_band,
          job,
          evaluation
        };
      })
      .sort((a, b) => b.overall_score - a.overall_score);
  },

  getJobCandidates(jobId: number, scope: CandidateScope = "applicants"): CandidatesOut {
    const jobs = loadList(STORAGE_KEYS.JOBS, INITIAL_JOBS);
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      throw { code: "NOT_FOUND", message: `Job #${jobId} not found.` };
    }

    const students = loadList(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    const applications = loadList(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
    const jobAppsByStudent = new Map<number, ApplicationOut>();
    applications
      .filter((a) => a.job_id === jobId)
      .forEach((a) => jobAppsByStudent.set(a.student_id, a));

    const targetStudents =
      scope === "applicants"
        ? students.filter((s) => jobAppsByStudent.has(s.id))
        : students;

    const candidates: CandidateRow[] = targetStudents
      .map((student) => {
        const evaluation = evaluateStudentForJob(student, job);
        const application = jobAppsByStudent.get(student.id) || null;
        return {
          student,
          evaluation,
          application
        };
      })
      .sort((a, b) => b.evaluation.score.overall_score - a.evaluation.score.overall_score);

    const eligible_count = candidates.filter((c) => c.evaluation.eligibility.is_eligible).length;
    const strong_match_count = candidates.filter(
      (c) => c.evaluation.score.match_band === "STRONG"
    ).length;

    return {
      job,
      total_candidates: candidates.length,
      eligible_count,
      strong_match_count,
      candidates
    };
  },

  bulkUpdateStatus(payload: BulkStatusRequest): BulkStatusOut {
    const applications = loadList(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
    const idSet = new Set(payload.application_ids);
    const updatedApps: ApplicationOut[] = [];
    const now = new Date().toISOString();

    const nextApplications = applications.map((app) => {
      if (idSet.has(app.id)) {
        const modified: ApplicationOut = {
          ...app,
          status: payload.target_status,
          updated_at: now
        };
        updatedApps.push(modified);
        return modified;
      }
      return app;
    });

    saveList(STORAGE_KEYS.APPLICATIONS, nextApplications);
    return {
      updated_count: updatedApps.length,
      applications: updatedApps
    };
  },

  seedDemoData(): SeedOut {
    saveList(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    saveList(STORAGE_KEYS.JOBS, INITIAL_JOBS);
    saveList(STORAGE_KEYS.APPLICATIONS, INITIAL_APPLICATIONS);
    return {
      students_created: INITIAL_STUDENTS.length,
      jobs_created: INITIAL_JOBS.length,
      applications_created: INITIAL_APPLICATIONS.length
    };
  }
};