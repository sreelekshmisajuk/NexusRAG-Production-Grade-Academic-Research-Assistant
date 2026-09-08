from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.document import DocumentChunk

class ScoredChunk(BaseModel):
    """A document chunk annotated with retrieval scores and provenance."""
    chunk: DocumentChunk
    dense_score: Optional[float] = Field(None, description="Cosine similarity score from dense vector search")
    sparse_score: Optional[float] = Field(None, description="BM25 relevance score from lexical search")
    rrf_score: Optional[float] = Field(None, description="Combined Reciprocal Rank Fusion score")
    final_score: float = Field(0.0, description="Rank score used for candidate ordering")
    retrieval_method: str = Field("hybrid", description="dense | sparse | hybrid | reranked")

class HybridSearchResult(BaseModel):
    """Encapsulates the complete result of a hybrid retrieval query."""
    query: str
    fused_chunks: List[ScoredChunk] = Field(default_factory=list, description="Top-k fused and ranked chunks")
    dense_count: int = 0
    sparse_count: int = 0
    total_fused: int = 0
    latency_ms: float = 0.0

class QueryRewriteResult(BaseModel):
    """Output from the Query Rewriter and HyDE generator."""
    original_query: str
    rewritten_queries: List[str] = Field(default_factory=list, description="List of decomposed or expanded search queries")
    hyde_passage: Optional[str] = Field(None, description="Hypothetical document passage if HyDE was activated")
    is_decomposed: bool = False

class PipelineRetrievalResult(BaseModel):
    """Encapsulates the full multi-stage retrieval pipeline output."""
    original_query: str
    rewrite_result: QueryRewriteResult
    candidate_chunks_count: int = 0
    reranked_chunks: List[ScoredChunk] = Field(default_factory=list, description="Final precision-filtered chunks")
    latency_breakdown_ms: Dict[str, float] = Field(default_factory=dict, description="Execution times per stage")
    total_latency_ms: float = 0.0
