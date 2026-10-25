
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Placemetrics AI",
    description="Explainable campus placement intelligence API",
    version="0.1.0",
)

# Allow our local React frontend to communicate with this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Placemetrics AI API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
