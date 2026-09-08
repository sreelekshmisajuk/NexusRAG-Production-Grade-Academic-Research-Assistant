import pytest
from app.database.vector_store import QdrantVectorStore
from app.models.document import DocumentChunk
from app.rag.bm25_search import BM25SearchEngine
from app.rag.hybrid_retriever import HybridRetriever

@pytest.fixture
def sample_chunks():
    return [
        DocumentChunk(
            chunk_id="doc1_p1_c0",
            doc_id="doc1",
            filename="paper_alpha.pdf",
            page_number=1,
            chunk_index=0,
            content="Reciprocal Rank Fusion (RRF) combines dense vector embeddings and BM25 lexical search.",
            token_count=18,
            section_header="1. Introduction",
            metadata={"title": "Paper Alpha"}
        ),
        DocumentChunk(
            chunk_id="doc1_p2_c1",
            doc_id="doc1",
            filename="paper_alpha.pdf",
            page_number=2,
            chunk_index=1,
            content="Convolutional neural networks and vision transformers achieve state-of-the-art results on image classification.",
            token_count=17,
            section_header="2. Computer Vision",
            metadata={"title": "Paper Alpha"}
        ),
        DocumentChunk(
            chunk_id="doc2_p1_c0",
            doc_id="doc2",
            filename="paper_beta.pdf",
            page_number=1,
            chunk_index=0,
            content="BM25 scoring is based on term frequency and inverse document frequency for keyword retrieval.",
            token_count=17,
            section_header="1. Information Retrieval",
            metadata={"title": "Paper Beta"}
        )
    ]

def test_qdrant_vector_store(sample_chunks):
    # Use in-memory Qdrant instance for test isolation
    qdrant = QdrantVectorStore(in_memory=True)
    count = qdrant.upsert_chunks(sample_chunks)
    assert count == 3
    assert qdrant.count() == 3

    # Semantic search for vision/images (should match chunk 2 even without exact word overlap)
    results = qdrant.search("visual models for recognizing pictures", top_k=2)
    assert len(results) > 0
    assert results[0].chunk.chunk_id == "doc1_p2_c1"
    assert results[0].dense_score is not None
    assert results[0].dense_score > 0.0

    # Filtering by doc_id
    filtered = qdrant.search("neural networks", top_k=2, doc_ids=["doc2"])
    assert len(filtered) == 1
    assert filtered[0].chunk.doc_id == "doc2"

def test_bm25_search_engine(sample_chunks, tmp_path):
    # Use isolated temp directory for test
    bm25 = BM25SearchEngine(storage_dir=tmp_path)
    count = bm25.index_chunks(sample_chunks)
    assert count == 3
    assert bm25.count() == 3

    # Exact keyword query
    results = bm25.search("inverse document frequency", top_k=2)
    assert len(results) > 0
    assert results[0].chunk.chunk_id == "doc2_p1_c0"
    assert results[0].sparse_score is not None
    assert results[0].sparse_score > 0.0

def test_hybrid_retriever_rrf(sample_chunks, tmp_path):
    qdrant = QdrantVectorStore(in_memory=True)
    bm25 = BM25SearchEngine(storage_dir=tmp_path)
    retriever = HybridRetriever(vector_store=qdrant, bm25_engine=bm25, rrf_k=60)

    # Index chunks into both
    retriever.index_chunks(sample_chunks)

    # Search for RRF and lexical search
    search_res = retriever.search("BM25 lexical search and RRF", top_k=3)
    assert search_res.total_fused > 0
    assert len(search_res.fused_chunks) > 0

    top_chunk = search_res.fused_chunks[0]
    # Chunk 0 matches both dense concepts and exact keywords
    assert top_chunk.chunk.chunk_id in ["doc1_p1_c0", "doc2_p1_c0"]
    assert top_chunk.rrf_score is not None
    assert top_chunk.final_score > 0.0

    # Deletion test
    retriever.delete_by_doc_id("doc1")
    post_delete = retriever.search("neural networks", top_k=3)
    # doc1 should no longer be present
    for r in post_delete.fused_chunks:
        assert r.chunk.doc_id != "doc1"
