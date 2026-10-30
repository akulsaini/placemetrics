from datetime import datetime
from typing import Annotated, Literal

from decimal import Decimal
from enum import Enum

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


# ---------- Shared configuration ----------

class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Student schemas ----------

class BranchEnum(str, Enum):
    CSE = "CSE"
    ECE = "ECE"
    EE = "EE"
    ME = "ME"
    CIVIL = "CIVIL"
    IT = "IT"

class StudentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    branch: BranchEnum
    cgpa: Decimal = Field(
        ge=0, le=10, max_digits=4, decimal_places=2
    )
    graduation_year: int = Field(ge=2020, le=2035)
    skills: list[Annotated[str, Field(min_length=1, max_length=50)]] = (
        Field(default_factory=list, max_length=50)
    )

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("skills")
    @classmethod
    def clean_skills(cls, skills: list[str]) -> list[str]:
        from app.services.skills import normalize_skills

        cleaned = []
        for skill in skills:
            skill = skill.strip()
            if not skill:
                raise ValueError("Skills cannot be blank")
            cleaned.append(skill)

        return normalize_skills(cleaned)


class StudentOut(APIModel):
    id: int
    name: str
    email: EmailStr
    branch: BranchEnum
    cgpa: float
    graduation_year: int
    skills: list[str]
    resume_filename: str | None
    has_resume: bool
    created_at: datetime


class ResumeUploadOut(APIModel):
    student_id: int
    filename: str
    characters_extracted: int
    extracted_skills: list[str]
    skills: list[str]
    resume_text_preview: str


# ---------- Job schemas ----------


class JobCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    company: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=20, max_length=20000)
    min_cgpa: Decimal = Field(
        ge=0, le=10, max_digits=4, decimal_places=2
    )
    allowed_branches: list[BranchEnum] = Field(
        min_length=1, max_length=6
    )
    target_graduation_year: int = Field(ge=2020, le=2035)
    required_skills: list[
        Annotated[str, Field(min_length=1, max_length=50)]
    ] = Field(default_factory=list, max_length=30)

    @field_validator("title", "company", "description")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value

    @field_validator("allowed_branches")
    @classmethod
    def validate_branches(
        cls, branches: list[BranchEnum]
    ) -> list[BranchEnum]:
        if len(branches) != len(set(branches)):
            raise ValueError("Duplicate branches are not allowed")
        return branches

    @field_validator("required_skills")
    @classmethod
    def clean_required_skills(cls, skills: list[str]) -> list[str]:
        cleaned = []
        seen = set()

        for skill in skills:
            skill = skill.strip().lower()
            if not skill:
                raise ValueError("Skills cannot be blank")
            if skill not in seen:
                cleaned.append(skill)
                seen.add(skill)

        return cleaned


class JobOut(APIModel):
    id: int
    title: str
    company: str
    description: str
    min_cgpa: Decimal
    allowed_branches: list[str]
    target_graduation_year: int
    required_skills: list[str]
    created_at: datetime
    applicant_count: int



# ---------- Application schemas ----------

class ApplicationStatus(str, Enum):
    APPLIED = "APPLIED"
    SHORTLISTED = "SHORTLISTED"
    INTERVIEW = "INTERVIEW"
    OFFER = "OFFER"
    REJECTED = "REJECTED"


class ApplicationCreate(BaseModel):
    student_id: int = Field(gt=0)
    job_id: int = Field(gt=0)


class ApplicationOut(APIModel):
    id: int
    student_id: int
    job_id: int
    status: ApplicationStatus
    match_score: Decimal
    eligibility_passed: bool
    applied_at: datetime
    updated_at: datetime


class BulkStatusUpdate(BaseModel):
    job_id: int = Field(gt=0)
    application_ids: list[int] = Field(min_length=1, max_length=500)
    new_status: ApplicationStatus

    @field_validator("application_ids")
    @classmethod
    def validate_unique_ids(cls, ids: list[int]) -> list[int]:
        if any(item <= 0 for item in ids):
            raise ValueError("Application IDs must be positive")
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate application IDs are not allowed")
        return ids

    @field_validator("new_status")
    @classmethod
    def validate_target_status(
        cls, value: ApplicationStatus
    ) -> ApplicationStatus:
        if value == ApplicationStatus.APPLIED:
            raise ValueError("Applications cannot be moved back to APPLIED")
        return value


class BulkStatusOut(BaseModel):
    job_id: int
    new_status: ApplicationStatus
    updated_count: int
    applications: list[ApplicationOut]

class EligibilityCheck(APIModel):
    passed: bool
    required: str
    actual: str


class EligibilityChecks(APIModel):
    cgpa: EligibilityCheck
    branch: EligibilityCheck
    graduation_year: EligibilityCheck


class EvaluationOut(APIModel):
    job_id: int
    student_id: int
    eligibility_passed: bool
    eligibility_checks: EligibilityChecks
    ineligibility_reasons: list[str]
    matched_skills: list[str]
    missing_skills: list[str]
    skill_match_ratio: float
    semantic_similarity: float
    match_score: float
    match_band: str
    embedding_backend: str
    improvement_suggestions: list[str]
    summary: str

class ApplicationWithJobOut(ApplicationOut):
    job: JobOut

class CandidateOut(BaseModel):
    rank: int
    application_id: int | None
    status: ApplicationStatus | None
    applied_at: datetime | None
    student: StudentOut
    evaluation: EvaluationOut


class CandidatesOut(BaseModel):
    job_id: int
    total: int
    eligible_count: int
    candidates: list[CandidateOut]


class SeedStudent(StudentCreate):
    resume_text: str | None = None


class SeedApplication(BaseModel):
    student_email: str
    job_index: int = Field(ge=0)
    status: ApplicationStatus


class SeedRequest(BaseModel):
    reset: bool = True
    students: list[SeedStudent] = Field(default_factory=list)
    jobs: list[JobCreate] = Field(default_factory=list)
    applications: list[SeedApplication] = Field(default_factory=list)


class SeedOut(BaseModel):
    students_created: int
    jobs_created: int
    applications_created: int
    used_builtin_dataset: bool
