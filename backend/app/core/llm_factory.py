import os
from typing import Optional
from dotenv import dotenv_values
from langchain_core.language_models import BaseChatModel

from app.core.config import settings, BASE_DIR
from app.core.logger import logger

def get_configured_llm(temperature: float = 0.0) -> Optional[BaseChatModel]:
    """
    Instantiates and returns the configured LangChain chat model.
    Checks settings, live .env file, and os.environ dynamically to support runtime updates.
    Returns None if required API keys are not provided, allowing graceful rule-based fallbacks.
    """
    env_file_path = BASE_DIR / ".env"
    live_env = dotenv_values(env_file_path) if env_file_path.exists() else {}

    provider = (
        live_env.get("LLM_PROVIDER")
        or os.environ.get("LLM_PROVIDER")
        or settings.LLM_PROVIDER
    ).lower().strip()

    try:
        if provider == "gemini":
            api_key = (
                live_env.get("GEMINI_API_KEY")
                or os.environ.get("GEMINI_API_KEY")
                or settings.GEMINI_API_KEY
                or ""
            ).strip()
            if not api_key:
                logger.warning("GEMINI_API_KEY not configured. Operating in fallback mode.")
                return None
            model_name = live_env.get("GEMINI_MODEL") or os.environ.get("GEMINI_MODEL") or settings.GEMINI_MODEL
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=api_key,
                temperature=temperature
            )

        elif provider == "openai":
            api_key = (
                live_env.get("OPENAI_API_KEY")
                or os.environ.get("OPENAI_API_KEY")
                or settings.OPENAI_API_KEY
                or ""
            ).strip()
            if not api_key:
                logger.warning("OPENAI_API_KEY not configured. Operating in fallback mode.")
                return None
            model_name = live_env.get("OPENAI_MODEL") or os.environ.get("OPENAI_MODEL") or settings.OPENAI_MODEL
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=model_name,
                api_key=api_key,
                temperature=temperature
            )

        elif provider == "groq":
            api_key = (
                live_env.get("GROQ_API_KEY")
                or os.environ.get("GROQ_API_KEY")
                or settings.GROQ_API_KEY
                or ""
            ).strip()
            if not api_key:
                logger.warning("GROQ_API_KEY not configured. Operating in fallback mode.")
                return None
            model_name = live_env.get("GROQ_MODEL") or os.environ.get("GROQ_MODEL") or settings.GROQ_MODEL
            from langchain_groq import ChatGroq
            return ChatGroq(
                model_name=model_name,
                groq_api_key=api_key,
                temperature=temperature
            )

        elif provider == "ollama":
            base_url = live_env.get("OLLAMA_BASE_URL") or os.environ.get("OLLAMA_BASE_URL") or settings.OLLAMA_BASE_URL
            model_name = live_env.get("OLLAMA_MODEL") or os.environ.get("OLLAMA_MODEL") or settings.OLLAMA_MODEL
            from langchain_community.chat_models import ChatOllama
            return ChatOllama(
                base_url=base_url,
                model=model_name,
                temperature=temperature
            )

        else:
            logger.warning("Unknown LLM provider: '%s'", provider)
            return None

    except Exception as e:
        logger.error("Error initializing LLM provider '%s': %s", provider, e)
        return None
