
# Placemetrics AI API Contract v1

Base URL: http://127.0.0.1:8000

All requests and responses use JSON.

## Health
GET /health

## Students
POST /students
GET /students

Student fields:
- full_name: string
- email: valid email, unique
- branch: string
- cgpa: number from 0 to 10
- graduation_year: integer
- skills: array of strings
- projects: array of strings

## Jobs
POST /jobs
GET /jobs

Job fields:
- title: string
- company: string
- min_cgpa: number from 0 to 10
- eligible_branches: array of strings
- graduation_year: integer
- required_skills: array of strings
- description: string

## Applications
POST /applications
GET /jobs/{job_id}/candidates
PATCH /applications/{application_id}/status

Application submission:
- student_id: integer
- job_id: integer

Allowed statuses:
- APPLIED
- SHORTLISTED
- INTERVIEW_SCHEDULED
- OFFERED
- REJECTED

Each student can apply to a job only once.

Eligibility must be evaluated independently of skills matching.
Return eligibility_status, eligibility_reasons, match_score,
matched_skills, and missing_skills.

Use HTTP 409 for duplicate applications, HTTP 404 for missing
resources, and HTTP 422 for invalid request data.
