import type { StudentOut, JobOut, ApplicationOut } from "../types";

export const INITIAL_STUDENTS: StudentOut[] = [
  {
    id: 1,
    name: "Aarav Sharma",
    email: "aarav.sharma@iitd.ac.in",
    branch: "CSE",
    cgpa: 9.15,
    backlogs: 0,
    graduation_year: 2026,
    skills: ["Python", "TypeScript", "React", "FastAPI", "PostgreSQL", "Docker", "PyTorch", "AWS"],
    resume_text:
      "Aarav Sharma - Full Stack & ML Engineer. Built distributed microservices using FastAPI, React, TypeScript, and PostgreSQL. Implemented transformer-based semantic search with PyTorch and Docker on AWS.",
    resume_filename: "aarav_sharma_resume.pdf",
    created_at: "2026-01-10T09:00:00Z"
  },
  {
    id: 2,
    name: "Priya Nair",
    email: "priya.nair@nitk.edu.in",
    branch: "IT",
    cgpa: 8.65,
    backlogs: 0,
    graduation_year: 2026,
    skills: ["Java", "Spring Boot", "Kubernetes", "React", "MySQL", "Redis", "Kafka"],
    resume_text:
      "Priya Nair - Backend Developer experienced in high-throughput Java Spring Boot services, Kafka event pipelines, Redis caching, MySQL optimization, and Kubernetes deployments.",
    resume_filename: "priya_nair_cv.pdf",
    created_at: "2026-01-11T10:30:00Z"
  },
  {
    id: 3,
    name: "Rohan Verma",
    email: "rohan.verma@bits.ac.in",
    branch: "ECE",
    cgpa: 7.85,
    backlogs: 0,
    graduation_year: 2026,
    skills: ["Python", "C++", "SQL", "TensorFlow", "Linux", "Git"],
    resume_text:
      "Rohan Verma - Electronics and Communication undergraduate focusing on embedded systems, C++, Python automation, SQL analytics, and TensorFlow computer vision models on Linux.",
    resume_filename: "rohan_verma_resume.pdf",
    created_at: "2026-01-12T11:15:00Z"
  },
  {
    id: 4,
    name: "Sneha Kulkarni",
    email: "sneha.k@vnit.ac.in",
    branch: "EE",
    cgpa: 6.9,
    backlogs: 1,
    graduation_year: 2026,
    skills: ["Python", "SQL", "Tableau", "Excel", "PowerBI"],
    resume_text:
      "Sneha Kulkarni - Data Analyst skilled in SQL queries, Python pandas data cleaning, Tableau dashboards, and business intelligence reporting.",
    resume_filename: "sneha_kulkarni_resume.pdf",
    created_at: "2026-01-14T14:20:00Z"
  },
  {
    id: 5,
    name: "Vikramaditya Rao",
    email: "vikram.rao@iiith.ac.in",
    branch: "CSE",
    cgpa: 9.45,
    backlogs: 0,
    graduation_year: 2026,
    skills: ["Python", "PyTorch", "NLP", "FastAPI", "Docker", "Kubernetes", "React", "PostgreSQL"],
    resume_text:
      "Vikramaditya Rao - AI Researcher & Systems Engineer. Published work on NLP embeddings and semantic retrieval. Productionized ML pipelines with PyTorch, FastAPI, PostgreSQL, Docker, and Kubernetes.",
    resume_filename: "vikram_rao_resume.pdf",
    created_at: "2026-01-15T08:45:00Z"
  }
];

export const INITIAL_JOBS: JobOut[] = [
  {
    id: 1,
    title: "AI Platform Engineer",
    company: "Atlan Cloud",
    location: "Bengaluru (Hybrid)",
    package_lpa: 28.0,
    min_cgpa: 7.5,
    max_backlogs: 0,
    allowed_branches: ["CSE", "IT", "ECE"],
    required_skills: ["Python", "FastAPI", "React", "PostgreSQL"],
    preferred_skills: ["Docker", "PyTorch", "TypeScript", "AWS"],
    description:
      "Join our core AI Platform engineering team to build semantic metadata engines, scalable FastAPI backends, React/TypeScript operator consoles, and PyTorch embedding pipelines deployed on AWS and Docker.",
    created_at: "2026-01-16T09:00:00Z"
  },
  {
    id: 2,
    title: "Software Development Engineer - Backend",
    company: "Razorpay",
    location: "Bengaluru",
    package_lpa: 24.5,
    min_cgpa: 7.0,
    max_backlogs: 0,
    allowed_branches: ["CSE", "IT", "ECE", "EE"],
    required_skills: ["Java", "Spring Boot", "MySQL", "Redis"],
    preferred_skills: ["Kafka", "Kubernetes", "Docker"],
    description:
      "Design ultra-low latency payment settlement microservices using Java, Spring Boot, MySQL, Redis, and Kafka running on Kubernetes clusters.",
    created_at: "2026-01-17T11:30:00Z"
  },
  {
    id: 3,
    title: "Decision Analytics Associate",
    company: "ZS Associates",
    location: "Pune",
    package_lpa: 13.5,
    min_cgpa: 6.5,
    max_backlogs: 1,
    allowed_branches: ["CSE", "IT", "ECE", "EE", "ME", "CIVIL"],
    required_skills: ["Python", "SQL"],
    preferred_skills: ["Tableau", "PowerBI", "Excel"],
    description:
      "Partner with global healthcare Fortune 500 clients to analyze commercial datasets using Python, SQL, and interactive Tableau/PowerBI visualizations.",
    created_at: "2026-01-18T13:00:00Z"
  }
];

export const INITIAL_APPLICATIONS: ApplicationOut[] = [
  {
    id: 1,
    student_id: 1,
    job_id: 1,
    status: "SHORTLISTED",
    overall_score: 96.4,
    match_band: "STRONG",
    created_at: "2026-01-20T10:00:00Z",
    updated_at: "2026-01-21T15:00:00Z"
  },
  {
    id: 2,
    student_id: 5,
    job_id: 1,
    status: "INTERVIEW",
    overall_score: 93.8,
    match_band: "STRONG",
    created_at: "2026-01-20T11:00:00Z",
    updated_at: "2026-01-22T09:30:00Z"
  },
  {
    id: 3,
    student_id: 3,
    job_id: 1,
    status: "APPLIED",
    overall_score: 48.2,
    match_band: "WEAK",
    created_at: "2026-01-20T12:00:00Z",
    updated_at: "2026-01-20T12:00:00Z"
  },
  {
    id: 4,
    student_id: 2,
    job_id: 2,
    status: "OFFER",
    overall_score: 94.1,
    match_band: "STRONG",
    created_at: "2026-01-21T09:00:00Z",
    updated_at: "2026-01-23T18:00:00Z"
  }
];