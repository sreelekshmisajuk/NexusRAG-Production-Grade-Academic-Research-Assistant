import pytest
import pymupdf
from pathlib import Path
from app.services.pdf_parser import PDFParserService
from app.services.chunker import ChunkerService
from app.services.document_service import DocumentService
from app.core.config import settings

@pytest.fixture
def sample_pdf_bytes() -> bytes:
    """Generates an in-memory 3-page academic PDF with headers, paragraphs, and hyphenation."""
    doc = pymupdf.open()

    # Page 1
    page1 = doc.new_page()
    page1.insert_text((50, 50), "Advances in Transformer RAG Systems\n", fontsize=16)
    page1.insert_text((50, 80), "Abstract\nRetrieval-augmented generation enhances large language models.", fontsize=11)
    page1.insert_text((50, 130), "1. Introduction\nLarge language models suffer from hallucinations. Recent trans-\nformers improve factual grounding through external knowledge retrieval.", fontsize=11)

    # Page 2
    page2 = doc.new_page()
    page2.insert_text((50, 50), "2. Methodology\nWe deploy a hybrid search engine uniting dense semantic vectors and sparse lexical BM25.", fontsize=11)
    page2.insert_text((50, 100), "A cross-encoder reranks the retrieved candidates according to relevance.", fontsize=11)

    # Page 3
    page3 = doc.new_page()
    page3.insert_text((50, 50), "3. Experimental Results\nOur benchmarks reveal a 38% improvement in citation accuracy.", fontsize=11)
    page3.insert_text((50, 100), "4. Conclusion\nHybrid retrieval with reranking represents a resilient architecture for enterprise RAG.", fontsize=11)

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

def test_pdf_parser_service(sample_pdf_bytes):
    parser = PDFParserService()
    doc_meta, pages = parser.parse_pdf(sample_pdf_bytes, filename="test_paper.pdf")

    assert doc_meta.filename == "test_paper.pdf"
    assert doc_meta.total_pages == 3
    assert len(pages) == 3
    assert doc_meta.file_size_bytes > 0
    assert len(doc_meta.file_hash) == 64

    # Page 1 checks
    p1 = pages[0]
    assert p1.page_number == 1
    # Check de-hyphenation: "trans-\nformer" should be cleaned to "transformer"
    assert "transformer" in p1.text.lower()
    assert "trans-\nformer" not in p1.text
    assert any("Introduction" in h for h in p1.headers)

    # Page 2 & 3 checks
    assert pages[1].page_number == 2
    assert "hybrid search" in pages[1].text.lower()
    assert pages[2].page_number == 3
    assert "citation accuracy" in pages[2].text.lower()

def test_chunker_service(sample_pdf_bytes):
    parser = PDFParserService()
    chunker = ChunkerService(chunk_size=150, chunk_overlap=30)
    
    doc_meta, pages = parser.parse_pdf(sample_pdf_bytes, filename="test_paper.pdf")
    chunks = chunker.chunk_document(doc_meta, pages)

    assert len(chunks) >= 3
    for idx, chunk in enumerate(chunks):
        assert chunk.doc_id == doc_meta.doc_id
        assert chunk.filename == "test_paper.pdf"
        assert chunk.page_number in [1, 2, 3]
        assert chunk.chunk_index == idx
        assert chunk.token_count > 0
        assert len(chunk.content) > 0
        assert chunk.chunk_id.startswith(f"{doc_meta.doc_id}_p")

def test_document_service_pipeline(sample_pdf_bytes):
    doc_service = DocumentService()
    try:
        doc_meta, pages, chunks, result = doc_service.process_pdf(
            sample_pdf_bytes,
            filename="academic_test.pdf",
            save_to_disk=True
        )

        assert result.doc_id == doc_meta.doc_id
        assert result.total_pages == 3
        assert result.total_chunks == len(chunks)
        assert result.total_tokens > 0
        assert "Successfully processed" in result.message

        # Verify upload was saved
        saved_files = list(Path(doc_service.save_uploaded_file(sample_pdf_bytes, "academic_test.pdf").parent).glob("*academic_test.pdf"))
        assert len(saved_files) > 0
    finally:
        # Clean up temporary test files so they do not pollute the uploads directory
        for f in settings.resolved_upload_dir.glob("*academic_test.pdf"):
            try:
                f.unlink()
            except OSError:
                pass
