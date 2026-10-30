
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.database import engine

router = APIRouter(tags=["Health"])


@router.get("/health")
def get_health():
    """Report API and database health."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "ok",
            "database": "up",
            "embedding_backend": "tfidf",
            "version": "1.0.0",
        }

    except SQLAlchemyError:
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "database": "down",
                "embedding_backend": "tfidf",
                "version": "1.0.0",
            },
        )
