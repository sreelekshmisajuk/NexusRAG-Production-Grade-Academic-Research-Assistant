import os
import re
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings, BASE_DIR
from app.core.logger import logger
from app.core.llm_factory import get_configured_llm
from app.services.container import container

router = APIRouter(prefix="/api/settings", tags=["Settings"])

class SettingsUpdateRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    llm_provider: Optional[str] = None

class SettingsStatusResponse(BaseModel):
    llm_provider: str
    has_gemini_key: bool
    has_openai_key: bool
    has_groq_key: bool
    masked_gemini_key: str
    active_model: str
    is_live_ai_active: bool

def _mask_key(key: Optional[str]) -> str:
    if not key or len(key) < 8:
        return ""
    return f"{key[:6]}...{key[-4:]}"

def _update_env_file(key: str, value: str):
    env_path = BASE_DIR / ".env"
    content = ""
    if env_path.exists():
        content = env_path.read_text(encoding="utf-8")

    pattern = rf'^{key}=.*$'
    new_line = f'{key}="{value}"'
    if re.search(pattern, content, flags=re.MULTILINE):
        content = re.sub(pattern, new_line, content, flags=re.MULTILINE)
    else:
        content += f"\n{new_line}\n"

    env_path.write_text(content, encoding="utf-8")
    logger.info("Updated %s in .env file.", key)

@router.get("", response_model=SettingsStatusResponse)
async def get_settings_status():
    from dotenv import dotenv_values
    env_path = BASE_DIR / ".env"
    live_env = dotenv_values(env_path) if env_path.exists() else {}

    gemini_key = (
        live_env.get("GEMINI_API_KEY")
        or os.environ.get("GEMINI_API_KEY")
        or settings.GEMINI_API_KEY
        or ""
    ).strip()

    openai_key = (
        live_env.get("OPENAI_API_KEY")
        or os.environ.get("OPENAI_API_KEY")
        or settings.OPENAI_API_KEY
        or ""
    ).strip()

    groq_key = (
        live_env.get("GROQ_API_KEY")
        or os.environ.get("GROQ_API_KEY")
        or settings.GROQ_API_KEY
        or ""
    ).strip()

    provider = (live_env.get("LLM_PROVIDER") or settings.LLM_PROVIDER).lower()

    has_active_key = False
    if provider == "gemini" and gemini_key:
        has_active_key = True
    elif provider == "openai" and openai_key:
        has_active_key = True
    elif provider == "groq" and groq_key:
        has_active_key = True

    return SettingsStatusResponse(
        llm_provider=provider,
        has_gemini_key=bool(gemini_key),
        has_openai_key=bool(openai_key),
        has_groq_key=bool(groq_key),
        masked_gemini_key=_mask_key(gemini_key),
        active_model=settings.GEMINI_MODEL if provider == "gemini" else provider,
        is_live_ai_active=has_active_key
    )

@router.post("")
async def update_settings(req: SettingsUpdateRequest):
    """
    Updates API keys and model configuration directly.
    Persists them to .env and updates runtime LLM graph immediately.
    """
    if req.gemini_api_key is not None:
        clean_key = req.gemini_api_key.strip()
        os.environ["GEMINI_API_KEY"] = clean_key
        settings.GEMINI_API_KEY = clean_key
        _update_env_file("GEMINI_API_KEY", clean_key)

    if req.openai_api_key is not None:
        clean_key = req.openai_api_key.strip()
        os.environ["OPENAI_API_KEY"] = clean_key
        settings.OPENAI_API_KEY = clean_key
        _update_env_file("OPENAI_API_KEY", clean_key)

    if req.groq_api_key is not None:
        clean_key = req.groq_api_key.strip()
        os.environ["GROQ_API_KEY"] = clean_key
        settings.GROQ_API_KEY = clean_key
        _update_env_file("GROQ_API_KEY", clean_key)

    if req.llm_provider is not None:
        clean_provider = req.llm_provider.strip().lower()
        os.environ["LLM_PROVIDER"] = clean_provider
        settings.LLM_PROVIDER = clean_provider
        _update_env_file("LLM_PROVIDER", clean_provider)

    # Re-initialize container LLM and reasoning chain immediately
    try:
        new_llm = get_configured_llm(temperature=0.0)
        if new_llm:
            container.reasoning_graph.llm = new_llm
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_core.output_parsers import StrOutputParser
            from app.rag.graph import SYNTHESIS_SYSTEM_PROMPT
            container.reasoning_graph.synthesis_chain = (
                ChatPromptTemplate.from_template(SYNTHESIS_SYSTEM_PROMPT) | new_llm | StrOutputParser()
            )
            container.reasoning_graph.hallucination_grader.llm = new_llm
            logger.info("Successfully re-initialized live LLM reasoning chain.")
    except Exception as e:
        logger.error("Error updating live LLM chain: %s", e)

    return {"status": "success", "message": "Settings updated and saved to .env successfully."}
