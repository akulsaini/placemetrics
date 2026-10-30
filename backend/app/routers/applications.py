
from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.errors import AppError
from app.models import Application, Job, Student
from app.schemas import ApplicationCreate, ApplicationOut, ApplicationWithJobOut, JobOut, BulkStatusOut, BulkStatusUpdate
from app.services.evaluator import evaluate


router = APIRouter(prefix="/applications", tags=["Applications"])


@router.post(
    "",
    response_model=ApplicationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
) -> ApplicationOut:
    """Create an application only when the student is eligible."""

    student = db.get(Student, payload.student_id)
    if student is None:
        raise AppError(
            "NOT_FOUND",
            f"Student {payload.student_id} not found.",
            404,
            {"resource": "student", "id": payload.student_id},
        )

    job = db.get(Job, payload.job_id)
    if job is None:
        raise AppError(
            "NOT_FOUND",
            f"Job {payload.job_id} not found.",
            404,
            {"resource": "job", "id": payload.job_id},
        )

    evaluation = evaluate(student, job)

    if not evaluation["eligibility_passed"]:
        raise AppError(
            "NOT_ELIGIBLE",
            "Student does not meet this job's eligibility criteria.",
            400,
            {
                "ineligibility_reasons": evaluation[
                    "ineligibility_reasons"
                ]
            },
        )

    application = Application(
        student_id=student.id,
        job_id=job.id,
        status="APPLIED",
        match_score=evaluation["match_score"],
        eligibility_passed=True,
    )

    db.add(application)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()

        existing = db.scalar(
            select(Application).where(
                Application.student_id == student.id,
                Application.job_id == job.id,
            )
        )

        if existing is not None:
            raise AppError(
                "DUPLICATE_APPLICATION",
                "Student has already applied to this job.",
                409,
                {"existing_application_id": existing.id},
            )

        raise

    db.refresh(application)

    return ApplicationOut(
        id=application.id,
        student_id=application.student_id,
        job_id=application.job_id,
        status=application.status,
        match_score=application.match_score,
        eligibility_passed=application.eligibility_passed,
        applied_at=application.applied_at,
        updated_at=application.updated_at,
    )

@router.get("/student/{student_id}", response_model=list[ApplicationWithJobOut])
def get_student_applications(
    student_id: int,
    db: Session = Depends(get_db),
):
    # 1. Verify that the student exists
    student = db.get(Student, student_id)

    if student is None:
        raise AppError(
            code="NOT_FOUND",
            message="Student not found",
            status_code=404,
            details={"resource": "student", "id": student_id},
        )

    # 2. Fetch applications and their related jobs
    stmt = (
        select(Application)
        .options(selectinload(Application.job))
        .where(Application.student_id == student_id)
        .order_by(Application.applied_at.desc(), Application.id.desc())
    )

    applications = db.scalars(stmt).all()

    # 3. Get applicant counts in one grouped query
    count_rows = db.execute(
        select(Application.job_id, func.count(Application.id))
        .group_by(Application.job_id)
    ).all()

    applicant_counts = {
        job_id: count for job_id, count in count_rows
    }

    # 4. Build the response
    results = []

    for application in applications:
        application_data = ApplicationOut.model_validate(
            application
        ).model_dump()

        job = application.job

        job_data = {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "description": job.description,
            "min_cgpa": job.min_cgpa,
            "allowed_branches": job.allowed_branches,
            "target_graduation_year": job.target_graduation_year,
            "required_skills": job.required_skills,
            "created_at": job.created_at,
            "applicant_count": applicant_counts.get(job.id, 0),
    }

        results.append(
            ApplicationWithJobOut(
                **application_data,
                job=JobOut(**job_data),
            )
        )

    return results

@router.patch("/bulk-status", response_model=BulkStatusOut)
def bulk_update_application_status(
    payload: BulkStatusUpdate,
    db: Session = Depends(get_db),
):
    try:
        # 1. Confirm that the job exists.
        job = db.get(Job, payload.job_id)

        if job is None:
            raise AppError(
                 "NOT_FOUND",
                   f"Job {payload.job_id} not found.",
                      404,
                      {"resource": "job", "id": payload.job_id},
            )

        # 2. Lock selected application rows in ID order.
        applications = db.scalars(
            select(Application)
            .where(Application.id.in_(payload.application_ids))
            .order_by(Application.id)
            .with_for_update()
        ).all()

        found_ids = {application.id for application in applications}
        missing_ids = [
            application_id
            for application_id in payload.application_ids
            if application_id not in found_ids
        ]

        # 3. If even one ID is missing, update nothing.
        if missing_ids:
            raise AppError(
                "NOT_FOUND",
              "One or more applications were not found.",
                404,
             {
                 "resource": "application",
                 "ids": missing_ids,
            },
            )

        # 4. All applications must belong to the requested job.
        wrong_job_ids = [
            application.id
            for application in applications
            if application.job_id != payload.job_id
        ]

        if wrong_job_ids:
            raise AppError(
                "BAD_REQUEST",
                "Some applications do not belong to this job.",
                400,
            {
                "application_ids": wrong_job_ids,
            },
        )

        # 5. Perform one bulk UPDATE.
        db.execute(
            update(Application)
            .where(Application.id.in_(payload.application_ids))
            .values(
                status=payload.new_status.value,
                updated_at=func.now(),
            )
        )

        db.commit()

        # 6. Fetch the updated rows in ID order.
        updated_applications = db.scalars(
            select(Application)
            .where(Application.id.in_(payload.application_ids))
            .order_by(Application.id)
        ).all()

        return BulkStatusOut(
            job_id=payload.job_id,
            new_status=payload.new_status,
            updated_count=len(updated_applications),
            applications=[
                ApplicationOut.model_validate(application)
                for application in updated_applications
            ],
        )

    except Exception:
        db.rollback()
        raise