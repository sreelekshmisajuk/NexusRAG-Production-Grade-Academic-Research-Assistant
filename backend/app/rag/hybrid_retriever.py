import time
from typing import Dict, List, Optional
from app.core.config import settings
from app.core.logger import logger
from app.database.vector_store import QdrantVectorStore
from app.models.document import DocumentChunk
from app.models.retrieval import HybridSearchResult, ScoredChunk
from app.rag.bm25_search import BM25SearchEngine

class HybridRetriever:
    """
    Advanced Hybrid Search Engine that fuses Dense Semantic Embeddings (Qdrant)
    and Sparse Lexical Keyword matching (BM25) using Reciprocal Rank Fusion (RRF).
    """

    def __init__(
        self,
        vector_store: Optional[QdrantVectorStore] = None,
        bm25_engine: Optional[BM25SearchEngine] = None,
        rrf_k: Optional[int] = None
    ):
        self.vector_store = vector_store or QdrantVectorStore()
        self.bm25_engine = bm25_engine or BM25SearchEngine()
        self.rrf_k = rrf_k or settings.RRF_K

    def index_chunks(self, chunks: List[DocumentChunk]) -> Dict[str, int]:
        """
        Indexes chunks concurrently into both the dense vector store and sparse BM25 engine.
        
        Args:
            chunks: List of DocumentChunk models
            
        Returns:
            Dictionary with counts indexed per store
        """
        if not chunks:
            return {"dense": 0, "sparse": 0}

        logger.info("Indexing %d chunks into Hybrid Search (Qdrant + BM25)...", len(chunks))
        dense_count = self.vector_store.upsert_chunks(chunks)
        sparse_count = self.bm25_engine.index_chunks(chunks)
        
        return {
            "dense": dense_count,
            "sparse": sparse_count
        }

    def search(
        self,
        query: str,
        dense_top_k: Optional[int] = None,
        sparse_top_k: Optional[int] = None,
        final_top_k: Optional[int] = None,
        top_k: Optional[int] = None,
        alpha: float = 0.5,
        doc_ids: Optional[List[str]] = None
    ) -> HybridSearchResult:
        """
        Performs hybrid retrieval using Reciprocal Rank Fusion (RRF).
        
        Formula:
            RRF(d) = alpha / (k + rank_dense) + (1 - alpha) / (k + rank_sparse)
            
        Args:
            query: Natural language query
            dense_top_k: Number of dense vector results to fetch
            sparse_top_k: Number of BM25 lexical results to fetch
            final_top_k: Final number of fused candidates to return
            top_k: Alias for final_top_k
            alpha: Dense weight (0.0 = pure BM25, 1.0 = pure semantic, 0.5 = balanced)
            doc_ids: Optional list of document IDs to filter by
            
        Returns:
            HybridSearchResult containing ranked ScoredChunk instances
        """
        start_time = time.perf_counter()
        effective_final_k = final_top_k or top_k
        dense_k = dense_top_k or (effective_final_k or settings.DENSE_TOP_K)
        sparse_k = sparse_top_k or (effective_final_k or settings.SPARSE_TOP_K)
        limit_k = effective_final_k or max(dense_k, sparse_k)

        # 1. Retrieve Dense Candidates (Semantic)
        dense_results = self.vector_store.search(query=query, top_k=dense_k, doc_ids=doc_ids)

        # 2. Retrieve Sparse Candidates (Lexical)
        sparse_results = self.bm25_engine.search(query=query, top_k=sparse_k, doc_ids=doc_ids)

        # 3. Reciprocal Rank Fusion (RRF)
        # Track chunks by chunk_id
        chunk_map: Dict[str, DocumentChunk] = {}
        dense_scores: Dict[str, float] = {}
        sparse_scores: Dict[str, float] = {}
        rrf_scores: Dict[str, float] = {}

        # Dense ranking scores
        for rank, scored in enumerate(dense_results, start=1):
            cid = scored.chunk.chunk_id
            chunk_map[cid] = scored.chunk
            dense_scores[cid] = scored.dense_score or 0.0
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (alpha / (self.rrf_k + rank))

        # Sparse ranking scores
        for rank, scored in enumerate(sparse_results, start=1):
            cid = scored.chunk.chunk_id
            if cid not in chunk_map:
                chunk_map[cid] = scored.chunk
            sparse_scores[cid] = scored.sparse_score or 0.0
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + ((1.0 - alpha) / (self.rrf_k + rank))

        # 4. Construct Fused Result List
        fused_chunks: List[ScoredChunk] = []
        for cid, rrf_score in rrf_scores.items():
            in_dense = cid in dense_scores
            in_sparse = cid in sparse_scores

            if in_dense and in_sparse:
                method = "hybrid"
            elif in_dense:
                method = "dense"
            else:
                method = "sparse"

            fused_chunks.append(ScoredChunk(
                chunk=chunk_map[cid],
                dense_score=dense_scores.get(cid),
                sparse_score=sparse_scores.get(cid),
                rrf_score=rrf_score,
                final_score=rrf_score,
                retrieval_method=method
            ))

        # Sort descending by fused RRF score
        fused_chunks.sort(key=lambda x: x.final_score, reverse=True)
        top_fused = fused_chunks[:limit_k]

        latency = (time.perf_counter() - start_time) * 1000

        logger.info(
            "Hybrid search for '%s' completed in %.2f ms (dense: %d, sparse: %d, fused: %d)",
            query, latency, len(dense_results), len(sparse_results), len(top_fused)
        )

        return HybridSearchResult(
            query=query,
            fused_chunks=top_fused,
            dense_count=len(dense_results),
            sparse_count=len(sparse_results),
            total_fused=len(fused_chunks),
            latency_ms=round(latency, 2)
        )

    def delete_by_doc_id(self, doc_id: str) -> None:
        """Deletes document vectors and lexical tokens from both stores."""
        self.vector_store.delete_by_doc_id(doc_id)
        self.bm25_engine.delete_by_doc_id(doc_id)
        logger.info("Successfully removed doc_id '%s' from all retrieval indices.", doc_id)
