import time
from typing import Dict, List, Optional
from app.core.config import settings
from app.core.logger import logger
from app.models.retrieval import PipelineRetrievalResult, ScoredChunk
from app.rag.hybrid_retriever import HybridRetriever
from app.rag.query_rewriter import QueryRewriter
from app.rag.reranker import FlashRankReranker

class RetrievalPipeline:
    """
    Production-grade multi-stage retrieval orchestrator:
    Query Rewriting / HyDE -> Multi-Query Hybrid Search (Qdrant + BM25 + RRF) -> FlashRank Cross-Encoder Reranking.
    """

    def __init__(
        self,
        hybrid_retriever: Optional[HybridRetriever] = None,
        query_rewriter: Optional[QueryRewriter] = None,
        reranker: Optional[FlashRankReranker] = None
    ):
        self.hybrid_retriever = hybrid_retriever or HybridRetriever()
        self.query_rewriter = query_rewriter or QueryRewriter()
        self.reranker = reranker or FlashRankReranker()

    def retrieve(
        self,
        query: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        use_hyde: bool = False,
        doc_ids: Optional[List[str]] = None,
        dense_top_k: Optional[int] = None,
        sparse_top_k: Optional[int] = None,
        rerank_top_k: Optional[int] = None
    ) -> PipelineRetrievalResult:
        """
        Executes the full end-to-end multi-stage retrieval pipeline.
        
        Args:
            query: Natural language query from user
            chat_history: Optional conversation history
            use_hyde: Whether to generate and search with a hypothetical document passage
            doc_ids: Optional list of document IDs to restrict search to
            dense_top_k: Number of dense vectors to fetch per sub-query
            sparse_top_k: Number of BM25 hits to fetch per sub-query
            rerank_top_k: Final count of high-precision chunks to return after reranking
            
        Returns:
            PipelineRetrievalResult with final chunks and stage-by-stage latencies
        """
        pipeline_start = time.perf_counter()
        latencies: Dict[str, float] = {}

        # ---------------------------------------------------------
        # Stage 1: Query Rewriting & Expansion
        # ---------------------------------------------------------
        t0 = time.perf_counter()
        rewrite_result = self.query_rewriter.rewrite(
            query=query,
            chat_history=chat_history,
            generate_hyde=use_hyde
        )
        latencies["query_rewrite"] = round((time.perf_counter() - t0) * 1000, 2)

        # Gather all queries to search (including HyDE if generated)
        search_queries = list(rewrite_result.rewritten_queries)
        if rewrite_result.hyde_passage:
            search_queries.append(rewrite_result.hyde_passage)

        # ---------------------------------------------------------
        # Stage 2: Multi-Query Hybrid Retrieval (Qdrant + BM25)
        # ---------------------------------------------------------
        t1 = time.perf_counter()
        candidate_pool: Dict[str, ScoredChunk] = {}

        for sq in search_queries:
            sub_res = self.hybrid_retriever.search(
                query=sq,
                dense_top_k=dense_top_k,
                sparse_top_k=sparse_top_k,
                doc_ids=doc_ids
            )
            for chunk in sub_res.fused_chunks:
                cid = chunk.chunk.chunk_id
                # Keep highest scoring instance across sub-queries
                if cid not in candidate_pool or chunk.final_score > candidate_pool[cid].final_score:
                    candidate_pool[cid] = chunk

        candidates = list(candidate_pool.values())
        latencies["hybrid_search"] = round((time.perf_counter() - t1) * 1000, 2)

        # ---------------------------------------------------------
        # Stage 3: FlashRank Cross-Encoder Reranking
        # ---------------------------------------------------------
        t2 = time.perf_counter()
        final_k = rerank_top_k or settings.RERANK_TOP_K
        reranked_chunks = self.reranker.rerank(
            query=query,
            candidates=candidates,
            top_k=final_k
        )
        latencies["reranking"] = round((time.perf_counter() - t2) * 1000, 2)

        total_latency = round((time.perf_counter() - pipeline_start) * 1000, 2)

        logger.info(
            "Retrieval pipeline complete in %.2f ms (candidates: %d, final: %d)",
            total_latency, len(candidates), len(reranked_chunks)
        )

        return PipelineRetrievalResult(
            original_query=query,
            rewrite_result=rewrite_result,
            candidate_chunks_count=len(candidates),
            reranked_chunks=reranked_chunks,
            latency_breakdown_ms=latencies,
            total_latency_ms=total_latency
        )
