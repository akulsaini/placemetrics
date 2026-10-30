
"""Shared skill normalization and resume skill detection."""

import re


ALIASES = {
    "js": "javascript",
    "ts": "typescript",
    "reactjs": "react",
    "react.js": "react",
    "node": "nodejs",
    "node.js": "nodejs",
    "postgres": "postgresql",
    "ml": "machine learning",
    "dl": "deep learning",
    "py": "python",
    "k8s": "kubernetes",
    "sklearn": "scikit-learn",
    "tf": "tensorflow",
    "cpp": "c++",
    "golang": "go",
    "ds": "data structures",
    "dsa": "data structures",
    "restful": "rest api",
    "rest": "rest api",
    "ci": "ci/cd",
    "cicd": "ci/cd",
    "tailwind": "tailwind css",
    "springboot": "spring boot",
    "natural language processing": "nlp",
    "cv": "computer vision",
    "object oriented programming": "oop",
}


SKILL_VOCABULARY = (
    "python", "java", "javascript", "typescript", "c", "c++", "c#",
    "go", "rust", "sql", "postgresql", "mysql", "mongodb", "redis",
    "react", "angular", "vue", "nodejs", "express", "fastapi",
    "django", "flask", "spring boot", "html", "css", "tailwind css",
    "docker", "kubernetes", "aws", "azure", "gcp", "git", "linux",
    "ci/cd", "rest api", "graphql", "microservices", "machine learning",
    "deep learning", "nlp", "computer vision", "data structures",
    "algorithms", "pandas", "numpy", "scikit-learn", "tensorflow",
    "pytorch", "power bi", "tableau", "excel", "embedded c", "verilog",
    "vhdl", "matlab", "autocad", "solidworks", "stm32", "iot",
    "system design", "oop", "agile",
)


def normalize_skill(skill: str) -> str:
    """Lowercase, trim, collapse whitespace, and apply contract aliases."""
    cleaned = " ".join(skill.strip().lower().split())
    return ALIASES.get(cleaned, cleaned)


def normalize_skills(skills: list[str]) -> list[str]:
    """Normalize skills and remove empty or duplicate entries."""
    result: list[str] = []
    seen: set[str] = set()

    for skill in skills:
        normalized = normalize_skill(skill)
        if normalized and normalized not in seen:
            result.append(normalized)
            seen.add(normalized)

    return result


def scan_resume_for_skills(resume_text: str) -> list[str]:
    """Detect contract vocabulary skills in resume text, in vocabulary order."""
    text = resume_text.lower()
    detected: list[str] = []

    # Include canonical terms and aliases, but always return canonical names.
    terms: dict[str, str] = {
        skill: skill for skill in SKILL_VOCABULARY
    }
    for alias, canonical in ALIASES.items():
        terms[alias] = canonical

    # Prefer longer terms first so specific terms are handled before short ones.
    for term in sorted(terms, key=len, reverse=True):
        if len(term) == 1:
            continue

        pattern = (
            r"(?<![A-Za-z0-9+#/.])"
            + re.escape(term)
            + r"(?![A-Za-z0-9+#/])"
        )

        if re.search(pattern, text, flags=re.IGNORECASE):
            canonical = terms[term]
            if canonical not in detected:
                detected.append(canonical)

    # Return a predictable vocabulary-based order, not regex iteration order.
    return [skill for skill in SKILL_VOCABULARY if skill in detected]
