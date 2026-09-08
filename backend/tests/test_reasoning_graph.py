import pytest
from app.database.vector_store import QdrantVectorStore
from app.models.document import DocumentChunk
from app.rag.bm25_search import BM25SearchEngine
from app.rag.graph import RAGReasoningGraph
from app.rag.hybrid_retriever import HybridRetriever
from app.rag.query_rewriter import QueryRewriter
from app.rag.reranker import FlashRankReranker
from app.rag.retrieval_pipeline import RetrievalPipeline

@pytest.fixture
def multi_doc_corpus():
    return [
        DocumentChunk(
            chunk_id="docA_p1_c0",
            doc_id="docA",
            filename="standard_transformers.pdf",
            page_number=1,
            chunk_index=0,
            content="Standard multi-head self-attention exhibits quadratic computational complexity of O(N^2) with respect to sequence length.",
            token_count=20,
            section_header="1. Complexity Analysis",
            metadata={"total_pages": 5}
        ),
        DocumentChunk(
            chunk_id="docB_p4_c8",
            doc_id="docB",
            filename="linear_transformers.pdf",
            page_number=4,
            chunk_index=8,
            content="Linear attention approximates kernel dot products to reduce sequence complexity to O(N), enabling 100k token contexts.",
            token_count=19,
            section_header="4. Kernel Approximation",
            metadata={"total_pages": 8}
        )
    ]

def test_multidoc_reasoning_graph(multi_doc_corpus, tmp_path):
    qdrant = QdrantVectorStore(in_memory=True)
    bm25 = BM25SearchEngine(storage_dir=tmp_path)
    hybrid_retriever = HybridRetriever(vector_store=qdrant, bm25_engine=bm25)
    hybrid_retriever.index_chunks(multi_doc_corpus)

    pipeline = RetrievalPipeline(
        hybrid_retriever=hybrid_retriever,
        query_rewriter=QueryRewriter(llm=None),
        reranker=FlashRankReranker()
    )

    graph = RAGReasoningGraph(retrieval_pipeline=pipeline, llm=None)

    query = "Compare the computational complexity between standard transformers and linear transformers"
    final_state = graph.execute(query=query)

    # Verify answers and multi-document citations
    assert final_state["answer"] is not None
    assert len(final_state["answer"]) > 0
    assert "standard_transformers.pdf" in final_state["answer"]
    assert "linear_transformers.pdf" in final_state["answer"]

    # Verify citations
    assert len(final_state["citations"]) >= 2
    filenames = [c["filename"] for c in final_state["citations"]]
    assert "standard_transformers.pdf" in filenames
    assert "linear_transformers.pdf" in filenames

    # Verify sources
    assert len(final_state["sources"]) == 2

    # Verify reasoning steps
    assert len(final_state["reasoning_steps"]) >= 4
    assert any("Decomposed" in s or "Analyzed" in s for s in final_state["reasoning_steps"])
    assert any("reranked" in s for s in final_state["reasoning_steps"])
    assert any("Extracted" in s for s in final_state["reasoning_steps"])

def test_conversational_history_flow(multi_doc_corpus, tmp_path):
    qdrant = QdrantVectorStore(in_memory=True)
    bm25 = BM25SearchEngine(storage_dir=tmp_path)
    hybrid_retriever = HybridRetriever(vector_store=qdrant, bm25_engine=bm25)
    hybrid_retriever.index_chunks(multi_doc_corpus)

    pipeline = RetrievalPipeline(
        hybrid_retriever=hybrid_retriever,
        query_rewriter=QueryRewriter(llm=None),
        reranker=FlashRankReranker()
    )

    graph = RAGReasoningGraph(retrieval_pipeline=pipeline, llm=None)

    history = [
        {"role": "user", "content": "What is the complexity of standard attention?"},
        {"role": "assistant", "content": "Standard attention is O(N^2) as shown in standard_transformers.pdf."}
    ]

    final_state = graph.execute(
        query="What alternative reduces this to linear complexity?",
        chat_history=history
    )

    assert final_state["answer"] is not None
    assert len(final_state["citations"]) > 0
    assert final_state["is_grounded"] is True
