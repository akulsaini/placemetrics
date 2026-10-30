from fastapi import APIRouter, Depends, status, File, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError
from app.models import Student
from app.schemas import StudentCreate, StudentOut, ResumeUploadOut
from app.services.resume_parser import extract_text
from app.services.skills import normalize_skills, scan_resume_for_skills


router = APIRouter(prefix="/students", tags=["Students"])


def student_to_out(student: Student) -> StudentOut:
    """Convert a database student into the public API response."""
    return StudentOut(
        id=student.id,
        name=student.name,
        email=student.email,
        branch=student.branch,
        cgpa=float(student.cgpa),
        graduation_year=student.graduation_year,
        skills=student.skills,
        resume_filename=student.resume_filename,
        has_resume=bool(student.resume_text),
        created_at=student.created_at,
    )


def get_student_or_404(db: Session, student_id: int) -> Student:
    student = db.get(Student, student_id)

    if student is None:
        raise AppError(
            "NOT_FOUND",
            "Student not found",
            404,
            {"resource": "student", "id": student_id},
        )

    return student


@router.post(
    "",
    response_model=StudentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
) -> StudentOut:
    # Friendly early check; the database constraint still protects
    # against duplicate requests arriving at the same time.
    existing = db.scalar(
        select(Student).where(Student.email == str(payload.email))
    )

    if existing is not None:
        raise AppError(
            "DUPLICATE_EMAIL",
            "A student with this email already exists",
            409,
            {"email": str(payload.email)},
        )

    student = Student(
        name=payload.name,
        email=str(payload.email),
        branch=payload.branch.value,
        cgpa=payload.cgpa,
        graduation_year=payload.graduation_year,
        skills=payload.skills,
    )

    db.add(student)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()

        # A concurrent request may have inserted the same email
        # after our initial check.
        existing = db.scalar(
            select(Student).where(Student.email == str(payload.email))
        )

        if existing is not None:
            raise AppError(
                "DUPLICATE_EMAIL",
                "A student with this email already exists",
                409,
                {"email": str(payload.email)},
            )

        raise

    db.refresh(student)
    return student_to_out(student)


@router.get("", response_model=list[StudentOut])
def list_students(
    db: Session = Depends(get_db),
) -> list[StudentOut]:
    students = db.scalars(
        select(Student).order_by(Student.id.asc())
    ).all()

    return [student_to_out(student) for student in students]


@router.get("/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
) -> StudentOut:
    student = get_student_or_404(db, student_id)
    return student_to_out(student)


@router.post(
    "/{student_id}/resume",
    response_model=ResumeUploadOut,
)
async def upload_student_resume(
    student_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> ResumeUploadOut:
    """Upload a student's resume, extract text, and merge detected skills."""

    student = get_student_or_404(db, student_id)

    try:
        file_bytes = await file.read()
    finally:
        await file.close()

    filename = file.filename or ""
    resume_text = extract_text(filename, file_bytes)
    extracted_skills = scan_resume_for_skills(resume_text)

    merged_skills = normalize_skills(
        list(student.skills or []) + extracted_skills
    )

    student.resume_text = resume_text
    student.resume_filename = filename
    student.skills = merged_skills

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return ResumeUploadOut(
        student_id=student.id,
        filename=filename,
        characters_extracted=len(resume_text),
        extracted_skills=extracted_skills,
        skills=merged_skills,
        resume_text_preview=resume_text[:500],
    )
