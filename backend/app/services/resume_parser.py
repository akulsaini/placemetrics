
"""Extract and validate text from uploaded PDF and TXT resumes."""

from io import BytesIO
import re

import pdfplumber
from PyPDF2 import PdfReader

from app.errors import AppError


MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_EXTRACTED_CHARACTERS = 20_000


def extract_text(filename: str, file_bytes: bytes) -> str:
    """Extract normalized text from a PDF or TXT resume."""

    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension not in {"pdf", "txt"}:
        raise AppError(
            "INVALID_FILE",
            "Only PDF and TXT resume files are supported.",
            400,
            {"filename": filename},
        )

    if len(file_bytes) > MAX_FILE_SIZE:
        raise AppError(
            "INVALID_FILE",
            "Resume file must not exceed 5 MB.",
            400,
            {"maximum_size_bytes": MAX_FILE_SIZE},
        )

    if not file_bytes:
        raise AppError(
            "INVALID_FILE",
            "The uploaded resume file is empty.",
            400,
            {"filename": filename},
        )

    if extension == "txt":
        text = file_bytes.decode("utf-8", errors="ignore")
    else:
        try:
            with pdfplumber.open(BytesIO(file_bytes)) as pdf:
                text = "\n".join(
                    page.extract_text() or "" for page in pdf.pages
                )
        except Exception:
            # Use PyPDF2 if pdfplumber cannot read the PDF.
            try:
                reader = PdfReader(BytesIO(file_bytes))
                text = "\n".join(
                    page.extract_text() or "" for page in reader.pages
                )
            except Exception as exc:
                raise AppError(
                    "INVALID_FILE",
                    "Could not read this PDF resume.",
                    400,
                    {"reason": str(exc)},
                ) from exc

    text = re.sub(r"\s+", " ", text).strip()
    text = text[:MAX_EXTRACTED_CHARACTERS]

    if not text:
        raise AppError(
            "INVALID_FILE",
            "No readable text was extracted. The PDF may be scanned or image-only.",
            400,
            {"filename": filename},
        )

    return text
