
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

class StudentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    branch: str = Field(min_length=1, max_length=10)
    cgpa: Decimal = Field(ge=0, le=10, max_digits=4, decimal_places=2)
    graduation_year: int = Field(ge=2020, le=2035)
    skills: list[str] = Field(default_factory=list, max_length=100)

    @field_validator("name", "branch")
    @classmethod
    def strip_text(cls, value: str) -> str:
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
        cleaned = []
        for skill in skills:
            skill = skill.strip()
            if skill and skill.lower() not in {
                item.lower() for item in cleaned
            }:
                cleaned.append(skill)
        return cleaned


class StudentOut(APIModel):
    id: int
    name: str
    email: EmailStr
    branch: str
    cgpa: Decimal
    graduation_year: int
    skills: list[str]
    resume_filename: str | None
    created_at: object


# ---------- Job schemas ----------

class JobCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    company: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    min_cgpa: Decimal = Field(
        ge=0, le=10, max_digits=4, decimal_places=2
    )
    allowed_branches: list[str] = Field(min_length=1, max_length=50)
    target_graduation_year: int = Field(ge=2020, le=2035)
    required_skills: list[str] = Field(
        default_factory=list, max_length=100
    )

    @field_validator("title", "company", "description")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value

    @field_validator("allowed_branches")
    @classmethod
    def clean_branches(cls, branches: list[str]) -> list[str]:
        cleaned = list(dict.fromkeys(
            branch.strip().upper()
            for branch in branches
            if branch.strip()
        ))
        if not cleaned:
            raise ValueError("At least one allowed branch is required")
        return cleaned

    @field_validator("required_skills")
    @classmethod
    def clean_required_skills(cls, skills: list[str]) -> list[str]:
        return list(dict.fromkeys(
            skill.strip()
            for skill in skills
            if skill.strip()
        ))


class JobOut(APIModel):
    id: int
    title: str
    company: str
    description: str
    min_cgpa: Decimal
    allowed_branches: list[str]
    target_graduation_year: int
    required_skills: list[str]
    created_at: object


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
    applied_at: object
    updated_at: object


class BulkStatusUpdate(BaseModel):
    application_ids: list[int] = Field(min_length=1, max_length=500)
    status: ApplicationStatus

    @field_validator("application_ids")
    @classmethod
    def validate_unique_ids(cls, ids: list[int]) -> list[int]:
        if any(item <= 0 for item in ids):
            raise ValueError("Application IDs must be positive")
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate application IDs are not allowed")
        return ids
