import io
import pytest
import pymupdf
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def test_pdf_file():
    doc = pymupdf.open()
    p = doc.new_page()
    p.insert_text((50, 50), "Attention Is All You Need\n", fontsize=16)
    p.insert_text((50, 90), "Abstract\nThe dominant sequence transduction models are based on complex recurrent or convolutional neural networks.", fontsize=11)
    p.insert_text((50, 140), "1. Introduction\nWe propose the Transformer, a model architecture eschewing recurrence and entirely relying on attention mechanisms.", fontsize=11)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

def test_document_lifecycle_and_chat_api(test_pdf_file):
    with TestClient(app) as test_client:
        # 1. Upload Document
        files = {
            "file": ("attention_paper.pdf", io.BytesIO(test_pdf_file), "application/pdf")
        }
        upload_resp = test_client.post("/api/documents/upload", files=files)
        assert upload_resp.status_code == 201
        upload_data = upload_resp.json()
        doc_id = upload_data["doc_id"]
        assert upload_data["filename"] == "attention_paper.pdf"
        assert upload_data["total_pages"] == 1
        assert upload_data["total_chunks"] >= 1

        # 2. List Documents
        list_resp = test_client.get("/api/documents")
        assert list_resp.status_code == 200
        docs = list_resp.json()
        assert any(d["doc_id"] == doc_id for d in docs)

        # 3. Get Specific Document
        doc_resp = test_client.get(f"/api/documents/{doc_id}")
        assert doc_resp.status_code == 200
        assert doc_resp.json()["doc_id"] == doc_id

        # 4. Stream PDF File Binary
        pdf_resp = test_client.get(f"/api/documents/{doc_id}/pdf")
        assert pdf_resp.status_code == 200
        assert pdf_resp.headers["content-type"] == "application/pdf"
        assert pdf_resp.content.startswith(b"%PDF")

        # 5. Query via Chat API
        chat_payload = {
            "query": "What model architecture is proposed to replace recurrence?",
            "session_id": "test_session_1",
            "chat_history": []
        }
        chat_resp = test_client.post("/api/chat", json=chat_payload)
        assert chat_resp.status_code == 200
        chat_data = chat_resp.json()
        assert len(chat_data["answer"]) > 0
        assert len(chat_data["citations"]) > 0
        assert chat_data["citations"][0]["filename"] == "attention_paper.pdf"
        assert len(chat_data["sources"]) > 0
        assert len(chat_data["reasoning_steps"]) >= 3
        assert chat_data["is_grounded"] is True

        # 6. Delete Document
        del_resp = test_client.delete(f"/api/documents/{doc_id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "deleted"

        # 7. Verify Document is Deleted
        get_deleted = test_client.get(f"/api/documents/{doc_id}")
        assert get_deleted.status_code == 404
