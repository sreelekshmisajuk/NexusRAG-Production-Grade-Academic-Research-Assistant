from pathlib import Path
from typing import List
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.logger import logger
from app.models.document import IngestionResult
from app.services.container import container

router = APIRouter(prefix="/api/documents", tags=["Documents"])

@router.post("/upload", response_model=IngestionResult, status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a research paper or PDF document.
    Parses, cleans text, extracts section headers, computes token counts,
    and indexes into Qdrant vector database and BM25 lexical index.
    """
    filename = file.filename or "uploaded_document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a PDF file (.pdf)."
        )

    try:
        content_bytes = await file.read()
        if not content_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty."
            )

        # 1. Save uploaded physical file to persistent storage
        saved_path = container.document_service.save_uploaded_file(content_bytes, filename)

        # 2. Parse and chunk document
        doc_meta, pages, chunks, ingest_result = container.document_service.process_pdf(
            content_bytes,
            filename=filename,
            save_to_disk=False
        )

        # 3. Index chunks into Hybrid Search (Qdrant + BM25)
        container.hybrid_retriever.index_chunks(chunks)

        # 4. Record document in catalog registry
        container.registry.register_document(
            meta=doc_meta,
            total_chunks=len(chunks),
            file_path=saved_path
        )

        logger.info("Successfully ingested and indexed '%s' (%d chunks).", filename, len(chunks))
        return ingest_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to process uploaded PDF '%s': %s", filename, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}"
        )

@router.get("", response_model=List[dict])
async def list_documents():
    """Lists all indexed documents currently stored in the research database."""
    return container.registry.list_documents()

@router.get("/{doc_id}")
async def get_document(doc_id: str):
    """Retrieves metadata and page details for a specific document."""
    doc = container.registry.get_document(doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found."
        )
    return doc

@router.get("/{doc_id}/pdf")
async def get_document_pdf(doc_id: str):
    """Serves the raw PDF binary stream for in-browser rendering and highlighting."""
    doc = container.registry.get_document(doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found."
        )

    file_path = Path(doc.get("file_path", ""))
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical PDF file is not available on disk."
        )

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=doc.get("filename", "document.pdf")
    )

@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Deletes a document from the registry, disk, Qdrant vectors, and BM25 index."""
    doc = container.registry.get_document(doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found."
        )

    # Remove from both Qdrant and BM25
    container.hybrid_retriever.delete_by_doc_id(doc_id)
    
    # Remove from registry and disk
    container.registry.delete_document(doc_id)

    logger.info("Deleted document '%s' across all storage layers.", doc_id)
    return {
        "status": "deleted",
        "doc_id": doc_id,
        "filename": doc.get("filename")
    }
