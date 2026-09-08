from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class DocumentMetadata(BaseModel):
    """Metadata representing an uploaded and indexed document."""
    doc_id: str = Field(..., description="Unique deterministic or generated identifier for the document")
    filename: str = Field(..., description="Original name of the uploaded file")
    file_size_bytes: int = Field(..., description="File size in bytes")
    total_pages: int = Field(..., description="Total number of pages in the PDF")
    file_hash: str = Field(..., description="SHA-256 hash of the file contents for deduplication")
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Upload timestamp")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional arbitrary metadata (e.g., author, title)")

class PageContent(BaseModel):
    """Structured text extracted from a single PDF page."""
    page_number: int = Field(..., description="1-indexed page number")
    text: str = Field(..., description="Extracted cleaned text content of the page")
    headers: List[str] = Field(default_factory=list, description="Section headers detected on this page")
    char_count: int = Field(..., description="Total character count on the page")

class DocumentChunk(BaseModel):
    """A granular chunk of a document ready for embedding, lexical search, and reranking."""
    chunk_id: str = Field(..., description="Unique chunk ID, e.g. docId_p1_c0")
    doc_id: str = Field(..., description="Parent document identifier")
    filename: str = Field(..., description="Original file name")
    page_number: int = Field(..., description="Page number where this chunk originates")
    chunk_index: int = Field(..., description="Sequential index of this chunk within the document")
    content: str = Field(..., description="The chunk text used for embedding and context generation")
    token_count: int = Field(..., description="Number of tokens in this chunk")
    section_header: Optional[str] = Field(None, description="Closest enclosing section header if detected")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom metadata for Qdrant payload")

class IngestionResult(BaseModel):
    """Summary of a completed document ingestion process."""
    doc_id: str
    filename: str
    total_pages: int
    total_chunks: int
    total_tokens: int
    file_hash: str
    message: str
