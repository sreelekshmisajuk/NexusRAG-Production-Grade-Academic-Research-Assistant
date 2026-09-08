import pytest
from pathlib import Path
from app.core.config import settings

def test_settings_load():
    """Verify that settings load with default values."""
    assert settings.APP_NAME == "Production RAG Research Assistant"
    assert settings.LLM_PROVIDER in ["gemini", "openai", "groq", "ollama"]
    assert settings.CHUNK_SIZE > 0
    assert settings.CHUNK_OVERLAP >= 0
    assert settings.DENSE_TOP_K > 0

def test_resolved_paths():
    """Verify that relative paths resolve properly to Path objects."""
    assert isinstance(settings.resolved_data_dir, Path)
    assert isinstance(settings.resolved_upload_dir, Path)
    assert isinstance(settings.resolved_qdrant_path, Path)
    assert isinstance(settings.resolved_bm25_path, Path)

def test_cors_origin_parsing():
    """Verify CORS origin parsing works correctly."""
    origins = settings.cors_origin_list
    assert isinstance(origins, list)
    assert len(origins) > 0
