import pytest
from app.database.vector_store import QdrantVectorStore
from app.models.document import DocumentChunk
from app.models.retrieval import ScoredChunk
from app.rag.bm25_search import BM25SearchEngine
from app.rag.hybrid_retriever import HybridRetriever
from app.rag.query_rewriter import QueryRewriter
from app.rag.reranker import FlashRankReranker
from app.rag.retrieval_pipeline import RetrievalPipeline

@pytest.fixture
def sample_corpus():
    return [
        DocumentChunk(
            chunk_id="paper1_p1_c0",
            doc_id="paper1",
            filename="rag_benchmarks.pdf",
            page_number=1,
            chunk_index=0,
            content="Reciprocal Rank Fusion (RRF) delivers a 24% boost in recall by synthesizing dense vector search and BM25.",
            token_count=21,
            section_header="1. Abstract"
        ),
        DocumentChunk(
            chunk_id="paper1_p3_c5",
            doc_id="paper1",
            filename="rag_benchmarks.pdf",
            page_number=3,
            chunk_index=5,
            content="Cross-encoder rerankers dramatically reduce hallucinations by evaluating query-document token interactions.",
            token_count=16,
            section_header="3. Reranking"
        ),
        DocumentChunk(
            chunk_id="paper2_p2_c2",
            doc_id="paper2",
            filename="climate_modeling.pdf",
            page_number=2,
            chunk_index=2,
            content="Atmospheric CO2 concentrations were measured across three oceanic monitoring stations during 2024.",
            token_count=16,
            section_header="2. Data Collection"
        )
    ]

def test_query_rewriter_heuristics():
    rewriter = QueryRewriter(llm=None)  # Test rule-based expansion
    query = "Compare performance of Hybrid RRF vs Pure Dense Vector Search"
    result = rewriter.rewrite(query=query)

    assert result.original_query == query
    assert len(result.rewritten_queries) >= 2
    assert any("RRF" in q for q in result.rewritten_queries)
    assert result.is_decomposed is True

def test_flashrank_reranker(sample_corpus):
    reranker = FlashRankReranker()
    scored_candidates = [
        ScoredChunk(chunk=sample_corpus[0], final_score=0.3, retrieval_method="hybrid"),
        ScoredChunk(chunk=sample_corpus[1], final_score=0.4, retrieval_method="hybrid"),
        ScoredChunk(chunk=sample_corpus[2], final_score=0.5, retrieval_method="hybrid"),
    ]

    # Query specifically about cross-encoders and hallucination reduction
    query = "How do cross-encoder rerankers prevent hallucination?"
    reranked = reranker.rerank(query=query, candidates=scored_candidates, top_k=2)

    assert len(reranked) == 2
    # The chunk explicitly about cross-encoder rerankers reducing hallucination must be rank 1
    assert reranked[0].chunk.chunk_id == "paper1_p3_c5"
    assert reranked[0].retrieval_method == "reranked"
    assert reranked[0].final_score > reranked[1].final_score

def test_end_to_end_retrieval_pipeline(sample_corpus, tmp_path):
    qdrant = QdrantVectorStore(in_memory=True)
    bm25 = BM25SearchEngine(storage_dir=tmp_path)
    hybrid_retriever = HybridRetriever(vector_store=qdrant, bm25_engine=bm25)
    
    # Index corpus
    hybrid_retriever.index_chunks(sample_corpus)

    rewriter = QueryRewriter(llm=None)
    reranker = FlashRankReranker()
    pipeline = RetrievalPipeline(
        hybrid_retriever=hybrid_retriever,
        query_rewriter=rewriter,
        reranker=reranker
    )

    result = pipeline.retrieve(
        query="What recall improvement does Reciprocal Rank Fusion achieve?",
        rerank_top_k=2
    )

    assert result.original_query == "What recall improvement does Reciprocal Rank Fusion achieve?"
    assert result.candidate_chunks_count >= 1
    assert len(result.reranked_chunks) > 0
    assert result.reranked_chunks[0].chunk.chunk_id == "paper1_p1_c0"
    assert "query_rewrite" in result.latency_breakdown_ms
    assert "hybrid_search" in result.latency_breakdown_ms
    assert "reranking" in result.latency_breakdown_ms
    assert result.total_latency_ms > 0.0
