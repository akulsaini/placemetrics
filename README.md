# Placemetrics AI

### An Explainable Campus Placement & Recruitment Intelligence Platform

Placemetrics AI is a full-stack campus placement platform designed to streamline the interaction between students, recruiters, and placement teams. It combines structured student and job data, automated eligibility validation, and explainable resume-to-job matching to make campus recruitment more organized and transparent.

The platform goes beyond a conventional job portal by helping recruiters identify relevant candidates while allowing students to understand their eligibility, application progress, and areas for improvement.

---

## 1. Problem Statement

Campus placement processes often involve scattered student information, manual eligibility verification, repetitive resume screening, and limited visibility into application progress.

This creates challenges for all stakeholders:

- **Students:** Difficulty tracking applications and understanding how well their profiles match job requirements.
- **Recruiters:** Time-consuming resume screening and candidate shortlisting.
- **Placement teams:** Difficulty coordinating recruitment activities and maintaining structured placement data.

## 2. Our Solution

Placemetrics AI brings these activities into one integrated platform.

It provides:
- Structured student profiles and resume management.
- Centralized job listings and recruitment requirements.
- Automated eligibility checks based on CGPA, branch, and graduation year.
- Resume-to-job matching using skill analysis and semantic similarity.
- Explainable candidate evaluations with matched skills, missing skills, and improvement suggestions.
- Application status tracking and recruiter-side candidate review.

The system combines automated evaluation with human review, keeping recruitment decisions under recruiter control.

## 3. Core Workflow

```text
Student Registration
        |
        v
Student Profile & Resume
        |
        v
Browse Available Jobs
        |
        v
Eligibility Validation
        |
        v
Resume–Job Matching
        |
        v
Application Submission
        |
        v
Recruiter Candidate Review
        |
        v
Application Status Updates
        |
        v
Student Progress Tracking
```

## 4. Key Features

| Feature | Description |
|---|---|
| Student Profiles | Maintain structured academic and skill information. |
| Resume Processing | Extract resume text and identify relevant skills. |
| Job Management | Create and browse job listings with defined requirements. |
| Eligibility Engine | Validate CGPA, branch, and graduation year against job criteria. |
| AI-Assisted Matching | Compare student skills and resume content with job descriptions. |
| Explainable Evaluation | Show match scores, matched skills, missing skills, and improvement suggestions. |
| Candidate Ranking | Help recruiters review and prioritize relevant candidates. |
| Application Tracking | Manage application statuses throughout the recruitment process. |
| Human Review | Keep recruiters involved in shortlisting and final decisions. |

## 5. Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI |
| Data Validation | Pydantic |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| AI / Matching | Skill normalization, semantic similarity, configurable embedding backend |
| Testing | pytest |

## 6. AI & Matching Approach

Placemetrics AI uses a hybrid evaluation approach rather than relying on a single similarity score.

**A. Hard Eligibility Validation**

The system checks three mandatory criteria:

- Minimum CGPA requirement.
- Eligible academic branch.
- Target graduation year.

These checks determine whether a student satisfies the job's eligibility requirements.

**B. Skill Matching**

The system compares the required skills in a job description with:
- Skills provided in the student's profile.
- Skills identified from the uploaded resume.

**C. Semantic Similarity**

The system evaluates the relationship between resume content and the job description using a configurable embedding backend.

**D. Explainable Results**

The evaluation provides:
- Eligibility result and individual eligibility checks.
- Matched and missing skills.
- Overall match score and match category.
- Suggestions to improve the student's profile.

The match score is intended to support recruiter evaluation, not replace human judgment.

## 7. Application Status Lifecycle

Applications can move through the following statuses:

`APPLIED` → `SHORTLISTED` → `INTERVIEW` → `OFFER`

A candidate may also receive the status `REJECTED`.

Students can track their application progress, while recruiters can review candidates and update application statuses.

## 8. System Architecture

```text
             FRONTEND
        React + TypeScript
                 |
                 | REST API
                 v
             BACKEND
          Python + FastAPI
                 |
       +---------+----------+
       |         |          |
       v         v          v
   Student     Job       Application
   Services  Services      Services
       |         |          |
       +---------+----------+
                 |
                 v
         EVALUATION ENGINE
       Eligibility Validation
         Skill Matching
       Semantic Similarity
       Explainable Results
                 |
                 v
             DATABASE
             PostgreSQL
```

## 9. Project Status

**Current stage: Hackathon MVP development**

The backend implementation includes:
- Student profile creation and retrieval.
- Resume upload and skill extraction.
- Job creation and listing.
- Job eligibility evaluation.
- Candidate evaluation and ranking.
- Application submission and student-side tracking.
- Bulk application status updates.
- PostgreSQL integration and API error handling.

The frontend is being developed separately and integrated with the backend through REST APIs.

Further integration, testing, and demo preparation are part of the MVP development process.

## 10. Running the Backend Locally

**Prerequisites**
- Python 3.12+ (use a Python version compatible with the project's installed dependencies).
- PostgreSQL.
- Git.

**Clone the repository**

```bash
git clone <repository-url>
cd placemetrics
```

**Create and activate a virtual environment**

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Install dependencies**

```powershell
pip install -r requirements.txt
```

**Configure environment variables**

Create a `backend/.env` file with your local PostgreSQL connection details and the configuration required by the backend.

Do not commit `.env` or database credentials to GitHub.

**Start the backend**

```powershell
python -m uvicorn app.main:app --reload
```

The API will be available at:

`http://127.0.0.1:8000`

Interactive API documentation:

`http://127.0.0.1:8000/docs`

## 11. Project Goals

Placemetrics AI aims to demonstrate how full-stack development, structured data validation, and explainable AI can improve a real campus recruitment workflow.

Our focus is to build a practical, transparent, and extensible placement intelligence platform that supports students, recruiters, and placement teams.

---

**Built for C2C – Code 2 Career Hackathon, MNIT Jaipur.**
