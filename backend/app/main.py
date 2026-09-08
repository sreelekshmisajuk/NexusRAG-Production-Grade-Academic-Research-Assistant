from pathlib import Path
from contextlib import asynccontextmanager
import time
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for initializing resources and clean shutdown."""
    logger.info("Initializing %s...", settings.APP_NAME)
    settings.init_directories()
    logger.info("LLM Provider configured: %s", settings.LLM_PROVIDER)
    logger.info("Embedding Model configured: %s", settings.EMBEDDING_MODEL)
    yield
    logger.info("Shutting down %s...", settings.APP_NAME)

app = FastAPI(
    title=settings.APP_NAME,
    description="Production-Grade RAG Research Assistant with Hybrid Search, Reranking, and Multi-Document Reasoning",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
from app.api.documents import router as documents_router
from app.api.chat import router as chat_router
from app.api.settings import router as settings_router

app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(settings_router)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "llm_provider": settings.LLM_PROVIDER,
        "embedding_model": settings.EMBEDDING_MODEL,
        "reranker_model": settings.RERANKER_MODEL,
        "storage": {
            "data_dir": str(settings.resolved_data_dir),
            "upload_dir": str(settings.resolved_upload_dir),
            "qdrant_path": str(settings.resolved_qdrant_path),
            "bm25_path": str(settings.resolved_bm25_path),
        }
    }

# Check for production frontend distribution
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if not FRONTEND_DIST.exists():
    FRONTEND_DIST = Path("/app/frontend/dist")

if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API routes, docs, and OpenAPI to bypass SPA handler
        if full_path.startswith("api/") or full_path in ["docs", "redoc", "openapi.json"]:
            raise HTTPException(status_code=404, detail="Not found")
        file_target = FRONTEND_DIST / full_path
        if file_target.is_file():
            return FileResponse(file_target)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    async def root():
        return {
            "message": f"Welcome to {settings.APP_NAME} API",
            "docs": "/docs",
            "health": "/api/health"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
