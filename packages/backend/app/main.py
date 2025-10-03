"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import projects, documents, configs, queries, experiments, settings as settings_api
from app.config import settings

app = FastAPI(
    title="RAG Studio API",
    description="API for RAG experimentation and testing",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=False,  # Must be False when allow_origins is ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(projects.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(configs.router, prefix="/api")
app.include_router(queries.router, prefix="/api")
app.include_router(experiments.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "RAG Studio API",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}
