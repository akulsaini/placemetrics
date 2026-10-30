
"""Placemetrics AI evaluation service.

Combines hard eligibility checks, normalized skill matching,
semantic similarity, and explainable improvement suggestions.
"""

import math
import re
from collections import Counter
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from app.services.embeddings import (
    get_embedding_backend,
    semantic_similarity,
)
from app.services.skills import (
    normalize_skills,
    scan_resume_for_skills,
)


STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for",
    "from", "has", "have", "in", "is", "it", "of", "on", "or",
    "our", "that", "the", "their", "this", "to", "we", "will",
    "with", "you", "your", "who", "which", "was", "were",
}


def _round_two(value: Any) -> Decimal:
    """Round a numeric value to two decimal places safely."""
    return Decimal(str(value)).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )


def _tokenize(text: str) -> list[str]:
    """Tokenize text using the contract's TF-IDF token rules."""
    tokens = re.findall(r"[a-z0-9+#]+", text.lower())
    return [
        token
        for token in tokens
        if (len(token) >= 2 or token == "c")
        and token not in STOPWORDS
    ]


def _top_missing_terms(
    resume_text: str,
    jd_text: str,
    n: int = 5,
) -> list[str]:
    """Return the highest-weight JD unigrams absent from resume tokens."""
    resume_tokens = _tokenize(resume_text)
    jd_tokens = _tokenize(jd_text)

    if not jd_tokens:
        return []

    resume_counts = Counter(resume_tokens)
    jd_counts = Counter(jd_tokens)

    first_position: dict[str, int] = {}
    for index, token in enumerate(jd_tokens):
        first_position.setdefault(token, index)

    candidates: list[tuple[str, float]] = []

    for term, count in jd_counts.items():
        if term in resume_counts:
            continue

        document_frequency = int(term in resume_counts) + int(term in jd_counts)
        tf = 1 + math.log(count)
        idf = math.log(3 / (1 + document_frequency)) + 1
        candidates.append((term, tf * idf))

    candidates.sort(
        key=lambda item: (
            -item[1],
            first_position[item[0]],
        )
    )
    return [term for term, _ in candidates[:n]]


def evaluate(student: Any, job: Any) -> dict[str, Any]:
    """Evaluate a student's eligibility and match quality for a job."""

    # ---------------------------------------------------------
    # 1. Normalize skills
    # ---------------------------------------------------------
    profile_skills = normalize_skills(student.skills or [])

    resume_text = student.resume_text or ""
    detected_resume_skills = scan_resume_for_skills(resume_text)

    effective_skills = set(
        normalize_skills(profile_skills + detected_resume_skills)
    )

    required_skills = normalize_skills(job.required_skills or [])

    matched_skills = [
        skill for skill in required_skills
        if skill in effective_skills
    ]
    missing_skills = [
        skill for skill in required_skills
        if skill not in effective_skills
    ]

    # ---------------------------------------------------------
    # 2. Hard eligibility checks
    # All three checks run; none short-circuits.
    # ---------------------------------------------------------
    student_cgpa = _round_two(student.cgpa)
    minimum_cgpa = _round_two(job.min_cgpa)

    cgpa_ok = student_cgpa >= minimum_cgpa
    branch_ok = student.branch in job.allowed_branches
    year_ok = student.graduation_year == job.target_graduation_year

    eligibility_passed = cgpa_ok and branch_ok and year_ok

    eligibility_checks = {
        "cgpa": {
            "passed": cgpa_ok,
            "required": f">= {minimum_cgpa:.2f}",
            "actual": f"{student_cgpa:.2f}",
        },
        "branch": {
            "passed": branch_ok,
            "required": ", ".join(job.allowed_branches),
            "actual": student.branch,
        },
        "graduation_year": {
            "passed": year_ok,
            "required": str(job.target_graduation_year),
            "actual": str(student.graduation_year),
        },
    }

    ineligibility_reasons: list[str] = []

    if not cgpa_ok:
        ineligibility_reasons.append(
            f"CGPA {student_cgpa:.2f} is below the required minimum "
            f"of {minimum_cgpa:.2f}."
        )

    if not branch_ok:
        allowed = ", ".join(job.allowed_branches)
        ineligibility_reasons.append(
            f"Branch {student.branch} is not in the allowed branches: "
            f"{allowed}."
        )

    if not year_ok:
        ineligibility_reasons.append(
            f"Graduation year {student.graduation_year} does not match "
            f"the required graduation year {job.target_graduation_year}."
        )

    # ---------------------------------------------------------
    # 3. Hybrid match score
    # ---------------------------------------------------------
    skill_ratio = (
        len(matched_skills) / len(required_skills)
        if required_skills
        else None
    )

    text_resume = student.resume_text or ", ".join(profile_skills)

    text_jd = (
        f"{job.title}. {job.description}. "
        f"Skills: {', '.join(required_skills)}"
    )

    cosine = semantic_similarity(text_resume, text_jd)
    cosine = max(0.0, min(1.0, float(cosine)))
    semantic_similarity_value = round(cosine, 4)

    embedding_backend = get_embedding_backend()

    if embedding_backend == "sentence-transformers":
        lower_bound, upper_bound = 0.10, 0.65
    else:
        lower_bound, upper_bound = 0.02, 0.35

    semantic_component = max(
        0.0,
        min(
            1.0,
            (cosine - lower_bound) / (upper_bound - lower_bound),
        ),
    )

    effective_skill_ratio = (
        skill_ratio
        if skill_ratio is not None
        else semantic_component
    )

    match_score = round(
        100 * (
            0.60 * effective_skill_ratio
            + 0.40 * semantic_component
        ),
        1,
    )

    if match_score >= 75:
        match_band = "STRONG"
    elif match_score >= 50:
        match_band = "MODERATE"
    else:
        match_band = "WEAK"

    # ---------------------------------------------------------
    # 4. Improvement suggestions
    # ---------------------------------------------------------
    suggestions: list[str] = []

    # Failed eligibility gates: fixed order.
    if not cgpa_ok:
        suggestions.append(
            "Your CGPA is below this role's cut-off; focus on roles "
            "with a lower cut-off or strengthen the rest of your profile."
        )

    if not branch_ok:
        allowed = ", ".join(job.allowed_branches)
        suggestions.append(
            f"This role is open only to {allowed}; look for openings "
            f"that accept {student.branch}."
        )

    if not year_ok:
        suggestions.append(
            f"This role targets the {job.target_graduation_year} batch; "
            f"look for roles matching your graduation year "
            f"({student.graduation_year})."
        )

    # Strong + eligible replaces suggestions 2–4.
    if match_band == "STRONG" and eligibility_passed:
        if matched_skills:
            top_skills = ", ".join(matched_skills[:3])
            suggestions = [
                f"Strong match: apply now and highlight your "
                f"{top_skills} experience."
            ]
        else:
            suggestions = ["Strong match: apply now and highlight your relevant experience."]
    else:
        # Missing skills: maximum five, in job order.
        for skill in missing_skills[:5]:
            suggestions.append(
                f"Add a project or certification demonstrating "
                f"'{skill}' and list it on your resume."
            )

        # Semantic gap.
        if semantic_component < 0.40:
            missing_terms = _top_missing_terms(
                text_resume,
                text_jd,
                n=5,
            )

            if missing_terms:
                terms = ", ".join(missing_terms)
                suggestions.append(
                    "Your resume wording is far from the job description; "
                    f"mirror its key terms, such as: {terms}."
                )
            else:
                suggestions.append(
                    "Rewrite your resume summary to mirror this job "
                    "description's language."
                )

        # Resume upload suggestion.
        if student.resume_text is None:
            suggestions.append(
                "Upload your resume; matching currently uses only "
                "your profile skills."
            )

    # ---------------------------------------------------------
    # 5. Summary
    # ---------------------------------------------------------
    if eligibility_passed:
        summary = (
            f"Eligible. {match_band} match ({match_score:.1f}/100): "
            f"{len(matched_skills)} of {len(required_skills)} "
            f"required skills matched."
        )
    else:
        summary = (
            f"Not eligible: {len(ineligibility_reasons)} criteria failed. "
            f"{match_band} skill match ({match_score:.1f}/100)."
        )

    # ---------------------------------------------------------
    # 6. Contract response
    # ---------------------------------------------------------
    return {
        "job_id": job.id,
        "student_id": student.id,
        "eligibility_passed": eligibility_passed,
        "eligibility_checks": eligibility_checks,
        "ineligibility_reasons": ineligibility_reasons,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "skill_match_ratio": round(effective_skill_ratio, 4),
        "semantic_similarity": semantic_similarity_value,
        "match_score": match_score,
        "match_band": match_band,
        "embedding_backend": embedding_backend,
        "improvement_suggestions": suggestions,
        "summary": summary,
    }
