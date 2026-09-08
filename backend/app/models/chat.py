from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class Citation(BaseModel):
    """An exact source citation referencing a document page and quote snippet."""
    citation_id: str = Field(..., description="Unique citation key e.g. [1] or [Paper, p.2]")
    doc_id: str = Field(..., description="Parent document identifier")
    filename: str = Field(..., description="Name of the cited document")
    page_number: int = Field(..., description="1-indexed physical PDF page")
    snippet: str = Field(..., description="Extracted textual snippet or quote from the source page")
    relevance_score: Optional[float] = Field(None, description="Score of the supporting chunk")
    is_verified: bool = Field(True, description="Whether citation was matched against source text")
    match_ratio: float = Field(1.0, description="Similarity / verification confidence score")

class HallucinationReport(BaseModel):
    """Detailed report on the factual grounding and hallucination status of a response."""
    is_grounded: bool = Field(..., description="True if faithfulness exceeds acceptable threshold")
    faithfulness_score: float = Field(..., description="Score between 0.0 (total hallucination) and 1.0 (fully grounded)")
    verified_claims: List[str] = Field(default_factory=list, description="Claims supported directly by context")
    ungrounded_claims: List[str] = Field(default_factory=list, description="Claims lacking context support")
    summary: str = Field("", description="Explanatory verdict of the hallucination check")

class ChatMessage(BaseModel):
    """A conversational turn in the research dialogue."""
    role: str = Field(..., description="'user' | 'assistant' | 'system'")
    content: str = Field(..., description="Message text")

class ChatRequest(BaseModel):
    """Request payload for the research chat assistant."""
    query: str = Field(..., description="User question or research prompt")
    session_id: Optional[str] = Field("default_session", description="Conversational thread ID")
    chat_history: List[ChatMessage] = Field(default_factory=list, description="Previous messages")
    doc_ids: Optional[List[str]] = Field(None, description="Optional document filter")
    use_hyde: bool = Field(False, description="Enable Hypothetical Document Embeddings")
    temperature: float = Field(0.0, description="Sampling temperature for answer generation")
    response_style: Optional[str] = Field("direct", description="Style: 'direct', 'bullets', 'table', 'detailed', 'executive'")
    detail_level: Optional[str] = Field("concise", description="Detail level: 'concise', 'standard', 'comprehensive'")

class ChatResponse(BaseModel):
    """Complete structured response from the research assistant."""
    answer: str = Field(..., description="Synthesized, grounded answer with inline citations")
    citations: List[Citation] = Field(default_factory=list, description="Verified citations referenced in answer")
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="Summary of retrieved source documents")
    reasoning_steps: List[str] = Field(default_factory=list, description="Step-by-step reasoning trail from LangGraph")
    is_grounded: bool = Field(True, description="Whether the answer passed factual grounding checks")
    faithfulness_score: float = Field(1.0, description="Estimated faithfulness / hallucination score (0.0 to 1.0)")
    hallucination_report: Optional[HallucinationReport] = Field(None, description="Detailed verification report")
    execution_time_ms: float = Field(0.0, description="Total pipeline latency in milliseconds")
