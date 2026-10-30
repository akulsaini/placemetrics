
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from typing import Literal

from app.database import get_db
from app.errors import AppError
from app.models import Application, Job , Student
from app.schemas import JobCreate, JobOut, EvaluationOut, ApplicationStatus, CandidateOut, CandidatesOut, StudentOut
from app.services.evaluator import evaluate
from app.routers.students import student_to_out

router = APIRouter(prefix="/jobs", tags=["Jobs"])


def job_to_out(job: Job, applicant_count: int) -> JobOut:
    """Convert a database job into the public API response."""
    return JobOut(
        id=job.id,
        title=job.title,
        company=job.company,
        description=job.description,
        min_cgpa=job.min_cgpa,
        allowed_branches=job.allowed_branches,
        target_graduation_year=job.target_graduation_year,
        required_skills=job.required_skills or [],
        created_at=job.created_at,
        applicant_count=applicant_count,
    )


@router.post(
    "",
    response_model=JobOut,
    status_code=status.HTTP_201_CREATED,
)
def create_job(
    payload: JobCreate,
    db: Session = Depends(get_db),
) -> JobOut:
    job = Job(
        title=payload.title,
        company=payload.company,
        description=payload.description,
        min_cgpa=payload.min_cgpa,
        allowed_branches=[
            branch.value for branch in payload.allowed_branches
        ],
        target_graduation_year=payload.target_graduation_year,
        required_skills=payload.required_skills,
    )

    db.add(job)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(job)

    return job_to_out(job, applicant_count=0)


@router.get("", response_model=list[JobOut])
def list_jobs(
    db: Session = Depends(get_db),
) -> list[JobOut]:
    applicant_count_query = (
        select(func.count(Application.id))
        .where(Application.job_id == Job.id)
        .correlate(Job)
        .scalar_subquery()
    )

    results = db.execute(
        select(Job, applicant_count_query)
        .order_by(Job.created_at.desc(), Job.id.desc())
    ).all()

    return [
        job_to_out(job, applicant_count)
        for job, applicant_count in results
    ]


@router.get(
    "/{job_id}/evaluate/{student_id}",
    response_model=EvaluationOut,
)
def evaluate_job_for_student(
    job_id: int,
    student_id: int,
    db: Session = Depends(get_db),
) -> EvaluationOut:
    """Evaluate one student's eligibility and match for one job."""

    job = db.get(Job, job_id)
    if job is None:
        raise AppError(
            "NOT_FOUND",
            f"Job {job_id} not found.",
            404,
        )

    student = db.get(Student, student_id)
    if student is None:
        raise AppError(
            "NOT_FOUND",
            f"Student {student_id} not found.",
            404,
        )

    result = evaluate(student, job)
    return EvaluationOut(**result)

@router.get("/{job_id}/candidates", response_model=CandidatesOut)
def get_job_candidates(
    job_id: int,
    status: ApplicationStatus | None = Query(default=None),
    eligible_only: bool = Query(default=False),
    scope: Literal["applicants", "all_students"] = Query(default="applicants"),
    db: Session = Depends(get_db),
):
    # 1. Verify job exists
    job = db.get(Job, job_id)

    if job is None:
        raise AppError(
            code="NOT_FOUND",
            message="Job not found",
            status_code=404,
            details={"resource": "job", "id": job_id},
        )

    # 2. Fetch students and their applications for this job
    if scope == "applicants":
        rows = db.execute(
            select(Student, Application)
            .join(Application, Application.student_id == Student.id)
            .where(Application.job_id == job_id)
        ).all()

        student_application_pairs = [
            (student, application) for student, application in rows
        ]

    else:
        students = db.scalars(
            select(Student).order_by(Student.id.asc())
        ).all()

        applications = db.scalars(
            select(Application).where(Application.job_id == job_id)
        ).all()

        application_map = {
            application.student_id: application
            for application in applications
        }

        student_application_pairs = [
            (student, application_map.get(student.id))
            for student in students
        ]

    # 3. Apply status filter
    if status is not None:
        student_application_pairs = [
            (student, application)
            for student, application in student_application_pairs
            if application is not None and application.status == status.value
        ]

    # 4. Evaluate each student against this job
    candidates = []

    for student, application in student_application_pairs:
        evaluation_data = evaluate(student, job)
        evaluation = EvaluationOut(**evaluation_data)
        student_data = StudentOut.model_validate(student_to_out(student))

        if eligible_only and not evaluation.eligibility_passed:
            continue

        candidates.append({
            "application_id": application.id if application else None,
            "status": application.status if application else None,
            "applied_at": application.applied_at if application else None,
            "student": student_data,
            "evaluation": evaluation,
        })

    # 5. Sort: eligible first, score descending, student ID ascending
    candidates.sort(
        key=lambda item: (
            not item["evaluation"].eligibility_passed,
            -item["evaluation"].match_score,
            item["student"].id,
        )
    )

    # 6. Assign ranks
    ranked_candidates = []

    for rank, candidate in enumerate(candidates, start=1):
        ranked_candidates.append(
            CandidateOut(
                rank=rank,
                **candidate,
            )
        )

    # 7. Return final response
    return CandidatesOut(
        job_id=job_id,
        total=len(ranked_candidates),
        eligible_count=sum(
            1 for candidate in ranked_candidates
            if candidate.evaluation.eligibility_passed
        ),
        candidates=ranked_candidates,
    )