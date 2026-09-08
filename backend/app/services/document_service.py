from pathlib import Path
from typing import List, Tuple, Union, Optional
from app.core.config import settings
from app.core.logger import logger
from app.models.document import DocumentChunk, DocumentMetadata, IngestionResult, PageContent
from app.services.chunker import ChunkerService
from app.services.pdf_parser import PDFParserService

class DocumentService:
    """Coordinates parsing, chunking, and storage of incoming research PDFs."""

    def __init__(
        self,
        parser: Optional[PDFParserService] = None,
        chunker: Optional[ChunkerService] = None
    ):
        self.parser = parser or PDFParserService()
        self.chunker = chunker or ChunkerService()

    def save_uploaded_file(self, content_bytes: bytes, filename: str) -> Path:
        """Saves uploaded PDF bytes into the persistent upload directory."""
        file_hash = self.parser.calculate_file_hash(content_bytes)
        safe_filename = f"{file_hash[:10]}_{filename}"
        dest_path = settings.resolved_upload_dir / safe_filename
        
        with open(dest_path, "wb") as f:
            f.write(content_bytes)
            
        logger.info("Saved PDF to disk at: %s", dest_path)
        return dest_path

    def process_pdf(
        self,
        file_input: Union[str, Path, bytes],
        filename: str,
        save_to_disk: bool = True
    ) -> Tuple[DocumentMetadata, List[PageContent], List[DocumentChunk], IngestionResult]:
        """
        Parses and chunks a PDF document, computing metrics and preparing chunks.
        
        Args:
            file_input: Path to PDF or raw bytes
            filename: Original file name
            save_to_disk: If True and bytes provided, saves to upload folder
            
        Returns:
            Tuple of (doc_meta, pages, chunks, ingestion_result)
        """
        if isinstance(file_input, bytes) and save_to_disk:
            self.save_uploaded_file(file_input, filename)

        doc_meta, pages = self.parser.parse_pdf(file_input, filename)
        chunks = self.chunker.chunk_document(doc_meta, pages)

        total_tokens = sum(c.token_count for c in chunks)

        ingestion_result = IngestionResult(
            doc_id=doc_meta.doc_id,
            filename=doc_meta.filename,
            total_pages=doc_meta.total_pages,
            total_chunks=len(chunks),
            total_tokens=total_tokens,
            file_hash=doc_meta.file_hash,
            message=f"Successfully processed {doc_meta.filename} into {len(chunks)} chunks across {doc_meta.total_pages} pages."
        )

        return doc_meta, pages, chunks, ingestion_result
