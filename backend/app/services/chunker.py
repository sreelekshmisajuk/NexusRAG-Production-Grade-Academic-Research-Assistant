from typing import List, Optional
import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.core.logger import logger
from app.models.document import DocumentChunk, DocumentMetadata, PageContent

class ChunkerService:
    """
    Production-grade document chunker that produces granular, token-counted chunks
    while preserving page numbers, section headers, and document lineage.
    """

    def __init__(
        self,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
        encoding_name: str = "cl100k_base"
    ):
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
        
        try:
            self.tokenizer = tiktoken.get_encoding(encoding_name)
        except Exception:
            self.tokenizer = tiktoken.encoding_for_model("gpt-4o-mini")

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", "; ", ", ", " ", ""]
        )

    def count_tokens(self, text: str) -> int:
        """Counts exact tokens in text using tiktoken."""
        if not text:
            return 0
        return len(self.tokenizer.encode(text, disallowed_special=()))

    def chunk_document(
        self,
        doc_meta: DocumentMetadata,
        pages: List[PageContent]
    ) -> List[DocumentChunk]:
        """
        Chunks all pages of a document while preserving strict page boundaries,
        lineage, and active section headers.
        
        Args:
            doc_meta: Parent document metadata
            pages: List of parsed PageContent objects
            
        Returns:
            List of DocumentChunk instances
        """
        chunks: List[DocumentChunk] = []
        global_chunk_idx = 0
        current_section = None

        logger.info(
            "Chunking document '%s' (size=%d, overlap=%d, pages=%d)",
            doc_meta.filename, self.chunk_size, self.chunk_overlap, len(pages)
        )

        for page in pages:
            # Update the latest section header if detected on this page
            if page.headers:
                current_section = page.headers[0]

            if not page.text.strip():
                continue

            # Split the page text
            page_text_splits = self.text_splitter.split_text(page.text)

            for split_idx, split_text in enumerate(page_text_splits):
                cleaned_split = split_text.strip()
                if not cleaned_split:
                    continue

                chunk_id = f"{doc_meta.doc_id}_p{page.page_number}_c{global_chunk_idx}"
                token_count = self.count_tokens(cleaned_split)

                chunk = DocumentChunk(
                    chunk_id=chunk_id,
                    doc_id=doc_meta.doc_id,
                    filename=doc_meta.filename,
                    page_number=page.page_number,
                    chunk_index=global_chunk_idx,
                    content=cleaned_split,
                    token_count=token_count,
                    section_header=current_section,
                    metadata={
                        "title": doc_meta.metadata.get("title") or doc_meta.filename,
                        "total_pages": doc_meta.total_pages,
                        "file_hash": doc_meta.file_hash,
                        "page_split_index": split_idx
                    }
                )
                chunks.append(chunk)
                global_chunk_idx += 1

        logger.info("Successfully produced %d chunks for document '%s'", len(chunks), doc_meta.filename)
        return chunks
