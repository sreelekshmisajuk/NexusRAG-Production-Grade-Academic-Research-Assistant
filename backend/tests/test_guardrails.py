import pytest
from app.models.document import DocumentChunk
from app.models.retrieval import ScoredChunk
from app.rag.citation_verifier import CitationVerifier
from app.rag.hallucination_grader import HallucinationGrader
from app.rag.graph import RAGReasoningGraph
from app.rag.retrieval_pipeline import RetrievalPipeline
from app.rag.hybrid_retriever import HybridRetriever
from app.database.vector_store import QdrantVectorStore
from app.rag.bm25_search import BM25SearchEngine
from app.rag.query_rewriter import QueryRewriter
from app.rag.reranker import FlashRankReranker

@pytest.fixture
def evidence_chunks():
    return [
        ScoredChunk(
            chunk=DocumentChunk(
                chunk_id="paper1_p2_c1",
                doc_id="paper1",
                filename="quantum_nlp.pdf",
                page_number=2,
                chunk_index=1,
                content="Our quantum natural language model achieved 94.2% accuracy on the Penn Treebank syntactic parsing benchmark.",
                token_count=19,
                section_header="2. Evaluation"
            ),
            final_score=0.92,
            retrieval_method="hybrid"
        ),
        ScoredChunk(
            chunk=DocumentChunk(
                chunk_id="paper1_p5_c4",
                doc_id="paper1",
                filename="quantum_nlp.pdf",
                page_number=5,
                chunk_index=4,
                content="Training required 16 IBM Qubit processors running over an 8-hour execution cycle.",
                token_count=14,
                section_header="5. Hardware"
            ),
            final_score=0.85,
            retrieval_method="hybrid"
        )
    ]

def test_citation_verifier(evidence_chunks):
    verifier = CitationVerifier()

    # Text containing both a valid citation and an invalid/fabricated citation
    answer_text = (
        "The model demonstrated 94.2% accuracy on syntax parsing [quantum_nlp.pdf, p. 2]. "
        "Furthermore, training consumed 500 megawatts of nuclear energy [quantum_nlp.pdf, p. 99]."
    )

    citations, rate = verifier.verify(answer_text, evidence_chunks)

    assert len(citations) == 2
    # Citation 1: Page 2 exists in chunks with high token overlap
    c1 = citations[0]
    assert c1.page_number == 2
    assert c1.filename == "quantum_nlp.pdf"
    assert c1.is_verified is True
    assert c1.match_ratio > 0.3

    # Citation 2: Page 99 does not exist in the retrieved evidence
    c2 = citations[1]
    assert c2.page_number == 99
    assert c2.is_verified is False
    assert c2.match_ratio == 0.0

    assert 0.0 < rate < 1.0

def test_hallucination_grader_grounded_vs_hallucinated(evidence_chunks):
    grader = HallucinationGrader(llm=None, threshold=0.7)

    # 1. Grounded Answer
    grounded_answer = "The quantum natural language model achieved 94.2% accuracy on the syntactic parsing benchmark [quantum_nlp.pdf, p. 2]."
    report_good = grader.grade(grounded_answer, evidence_chunks)

    assert report_good.is_grounded is True
    assert report_good.faithfulness_score >= 0.7
    assert len(report_good.verified_claims) >= 1

    # 2. Fabricated / Hallucinated Answer
    hallucinated_answer = "The system achieved 100% zero-shot translation across 800 Martian dialects using solar radiation."
    report_bad = grader.grade(hallucinated_answer, evidence_chunks)

    assert report_bad.is_grounded is False
    assert report_bad.faithfulness_score < 0.5
    assert len(report_bad.ungrounded_claims) >= 1

def test_end_to_end_reasoning_with_guardrails(evidence_chunks, tmp_path):
    qdrant = QdrantVectorStore(in_memory=True)
    bm25 = BM25SearchEngine(storage_dir=tmp_path)
    retriever = HybridRetriever(vector_store=qdrant, bm25_engine=bm25)
    
    # Index chunks
    raw_chunks = [sc.chunk for sc in evidence_chunks]
    retriever.index_chunks(raw_chunks)

    pipeline = RetrievalPipeline(
        hybrid_retriever=retriever,
        query_rewriter=QueryRewriter(llm=None),
        reranker=FlashRankReranker()
    )

    graph = RAGReasoningGraph(retrieval_pipeline=pipeline, llm=None)
    result = graph.execute(query="What was the benchmark accuracy of the quantum model?")

    assert result["answer"] is not None
    assert len(result["citations"]) > 0
    assert result["hallucination_report"] is not None
    assert "faithfulness_score" in result["hallucination_report"]
    assert result["is_grounded"] is True
    assert any("Citation verification" in s for s in result["reasoning_steps"])
    assert any("Grounding verdict" in s for s in result["reasoning_steps"])
