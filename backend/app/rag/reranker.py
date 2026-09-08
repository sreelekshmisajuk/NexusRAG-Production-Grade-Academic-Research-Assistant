from typing import List, Optional
from flashrank import Ranker, RerankRequest

from app.core.config import settings
from app.core.logger import logger
from app.models.retrieval import ScoredChunk

class FlashRankReranker:
    """
    Ultra-fast, CPU-friendly Cross-Encoder Reranker using FlashRank (ONNX).
    Scores (Query, Document Chunk) pairs with full cross-attention to select top precision context.
    """

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or getattr(settings, "RERANKER_MODEL", "ms-marco-TinyBERT-L-2-v2")
        cache_dir = str(settings.resolved_data_dir / "cache" / "flashrank")
        try:
            self.ranker = Ranker(model_name=self.model_name, cache_dir=cache_dir)
            logger.info("Initialized FlashRank Cross-Encoder '%s' (cache: %s).", self.model_name, cache_dir)
        except Exception as e:
            logger.warning("FlashRank init failed with model '%s': %s. Falling back to default Ranker.", self.model_name, e)
            self.ranker = Ranker(cache_dir=cache_dir)

    def rerank(
        self,
        query: str,
        candidates: List[ScoredChunk],
        top_k: Optional[int] = None
    ) -> List[ScoredChunk]:
        """
        Reranks a list of candidate ScoredChunks using cross-attention relevance.
        
        Args:
            query: User's search query
            candidates: Candidate ScoredChunk instances from hybrid retrieval
            top_k: Number of highest-precision chunks to return
            
        Returns:
            List of ScoredChunk models sorted descending by cross-encoder score
        """
        if not candidates:
            return []

        limit_k = top_k or settings.RERANK_TOP_K

        # Deduplicate candidates by chunk_id
        unique_candidates: dict[str, ScoredChunk] = {}
        for c in candidates:
            if c.chunk.chunk_id not in unique_candidates:
                unique_candidates[c.chunk.chunk_id] = c

        candidate_list = list(unique_candidates.values())

        # If candidates count is less than or equal to requested top_k and small, reranking still improves ordering
        passages = [
            {
                "id": sc.chunk.chunk_id,
                "text": sc.chunk.content,
                "meta": {
                    "dense_score": sc.dense_score,
                    "sparse_score": sc.sparse_score,
                    "rrf_score": sc.rrf_score
                }
            }
            for sc in candidate_list
        ]

        rerank_req = RerankRequest(query=query, passages=passages)
        
        try:
            reranked_results = self.ranker.rerank(rerank_req)
        except Exception as e:
            logger.error("FlashRank reranking error: %s. Returning unranked candidates.", e)
            return candidate_list[:limit_k]

        reranked_chunks: List[ScoredChunk] = []
        for res in reranked_results[:limit_k]:
            cid = res["id"]
            orig = unique_candidates[cid]
            reranked_chunks.append(ScoredChunk(
                chunk=orig.chunk,
                dense_score=orig.dense_score,
                sparse_score=orig.sparse_score,
                rrf_score=orig.rrf_score,
                final_score=float(res["score"]),
                retrieval_method="reranked"
            ))

        logger.info(
            "FlashRank reranked %d candidates down to top %d chunks for query '%s'.",
            len(candidate_list), len(reranked_chunks), query
        )
        return reranked_chunks
