
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Student(Base):
    __tablename__ = "students"

    __table_args__ = (
        UniqueConstraint("email", name="uq_students_email"),
        CheckConstraint(
            "cgpa >= 0 AND cgpa <= 10",
            name="ck_students_cgpa_range",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    branch: Mapped[str] = mapped_column(String(10), nullable=False)
    cgpa: Mapped[float] = mapped_column(
        Numeric(4, 2), nullable=False
    )
    graduation_year: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    skills: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    resume_text: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    resume_filename: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    applications: Mapped[list["Application"]] = relationship(
        back_populates="student",
        cascade="all, delete",
        passive_deletes=True,
    )


class Job(Base):
    __tablename__ = "jobs"

    __table_args__ = (
        CheckConstraint(
            "min_cgpa >= 0 AND min_cgpa <= 10",
            name="ck_jobs_min_cgpa_range",
        ),
        CheckConstraint(
            "jsonb_array_length(allowed_branches) >= 1",
            name="ck_jobs_allowed_branches_nonempty",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    title: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    company: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    description: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    min_cgpa: Mapped[float] = mapped_column(
        Numeric(4, 2), nullable=False
    )
    allowed_branches: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False
    )
    target_graduation_year: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    required_skills: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    applications: Mapped[list["Application"]] = relationship(
        back_populates="job",
        cascade="all, delete",
        passive_deletes=True,
    )


class Application(Base):
    __tablename__ = "applications"

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "job_id",
            name="uq_applications_student_job",
        ),
        Index(
            "ix_applications_job_id_status",
            "job_id",
            "status",
        ),
        Index(
            "ix_applications_student_id",
            "student_id",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
    )
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(12),
        nullable=False,
        default="APPLIED",
        server_default=text("'APPLIED'"),
    )
    match_score: Mapped[float] = mapped_column(
        Numeric(5, 1), nullable=False
    )
    eligibility_passed: Mapped[bool] = mapped_column(
        Boolean, nullable=False
    )
    applied_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    student: Mapped["Student"] = relationship(
        back_populates="applications"
    )
    job: Mapped["Job"] = relationship(
        back_populates="applications"
    )
