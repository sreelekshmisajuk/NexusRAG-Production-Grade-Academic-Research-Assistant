from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict
from app.models.retrieval import ScoredChunk

class RAGGraphState(TypedDict):
    """
    Internal state tracking for the LangGraph multi-document reasoning workflow.
    """
    # Inputs
    query: str
    session_id: str
    chat_history: List[Dict[str, str]]
    doc_ids: Optional[List[str]]
    use_hyde: bool
    temperature: float
    response_style: Optional[str]
    detail_level: Optional[str]

    # Internal pipeline state
    decomposed_queries: List[str]
    retrieved_chunks: List[ScoredChunk]
    formatted_context: str

    # Outputs
    answer: str
    citations: List[Dict[str, Any]]
    sources: List[Dict[str, Any]]
    reasoning_steps: List[str]
    is_grounded: bool
    faithfulness_score: float
    hallucination_report: Optional[Dict[str, Any]]
