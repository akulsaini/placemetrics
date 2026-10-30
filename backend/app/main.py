
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.database import Base, engine
from app.errors import register_error_handlers
from app import models  # noqa: F401
from app.routers import applications
from app.routers.health import router as health_router
from app.routers.students import router as students_router
from app.routers.jobs import router as jobs_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Wait for PostgreSQL, then create tables."""
    for attempt in range(30):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))

            Base.metadata.create_all(bind=engine)
            break

        except SQLAlchemyError:
            if attempt == 29:
                raise
            time.sleep(1)

    yield


app = FastAPI(
    title="Placemetrics AI",
    description="Explainable campus placement intelligence API",
    version="1.0.0",
    lifespan=lifespan,
)

register_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Placemetrics AI API is running"}


app.include_router(health_router, prefix="/api/v1")
app.include_router(students_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")
app.include_router(applications.router, prefix="/api/v1")