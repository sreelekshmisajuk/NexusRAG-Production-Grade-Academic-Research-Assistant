from pathlib import Path
from typing import Literal, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from app.core.logger import logger

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application
    APP_NAME: str = "Production RAG Research Assistant"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # LLM Provider Configuration
    LLM_PROVIDER: Literal["gemini", "openai", "groq", "ollama"] = "gemini"
    
    # Provider API Keys
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None

    # Model Names
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OPENAI_MODEL: str = "gpt-4o-mini"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"

    # Embeddings & Reranker
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DEVICE: str = "cpu"
    RERANKER_MODEL: str = "ms-marco-MiniLM-L-6-v2"

    # Storage Paths
    DATA_DIR: str = "./data"
    UPLOAD_DIR: str = "./data/uploads"
    QDRANT_STORAGE_PATH: str = "./data/qdrant"
    BM25_STORAGE_PATH: str = "./data/bm25"

    # RAG Retrieval Parameters
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 100
    DENSE_TOP_K: int = 15
    SPARSE_TOP_K: int = 15
    RERANK_TOP_K: int = 5
    RRF_K: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def resolved_data_dir(self) -> Path:
        p = Path(self.DATA_DIR)
        return p if p.is_absolute() else BASE_DIR / p

    @property
    def resolved_upload_dir(self) -> Path:
        p = Path(self.UPLOAD_DIR)
        return p if p.is_absolute() else BASE_DIR / p

    @property
    def resolved_qdrant_path(self) -> Path:
        p = Path(self.QDRANT_STORAGE_PATH)
        return p if p.is_absolute() else BASE_DIR / p

    @property
    def resolved_bm25_path(self) -> Path:
        p = Path(self.BM25_STORAGE_PATH)
        return p if p.is_absolute() else BASE_DIR / p

    def init_directories(self) -> None:
        """Ensure all storage folders exist."""
        for path in [
            self.resolved_data_dir,
            self.resolved_upload_dir,
            self.resolved_qdrant_path,
            self.resolved_bm25_path,
        ]:
            path.mkdir(parents=True, exist_ok=True)
        logger.info("Storage directories verified.")

settings = Settings()
