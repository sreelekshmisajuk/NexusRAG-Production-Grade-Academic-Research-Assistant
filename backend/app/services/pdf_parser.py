import hashlib
import re
from pathlib import Path
from typing import List, Tuple, Union, Optional
import pymupdf

from app.core.logger import logger
from app.models.document import DocumentMetadata, PageContent

class PDFParserService:
    """Production-grade PDF parsing service with page-level tracking and text cleanup."""

    @staticmethod
    def calculate_file_hash(content: bytes) -> str:
        """Calculates SHA-256 hash of file bytes for deduplication."""
        return hashlib.sha256(content).hexdigest()

    @staticmethod
    def clean_text(text: str) -> str:
        """
        Cleans extracted PDF text:
        - Resolves hyphenated line wraps (e.g., 'trans- \nformer' -> 'transformer')
        - Standardizes unicode whitespace
        - Collapses spurious empty lines while preserving paragraph boundaries
        """
        if not text:
            return ""

        # Remove hyphenation at line breaks
        text = re.sub(r'(\b\w+)-\s*\n\s*(\w+\b)', r'\1\2', text)
        
        # Replace carriage returns
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Collapse multiple horizontal whitespaces (spaces, tabs) into single space
        text = re.sub(r'[ \t]+', ' ', text)
        
        # Collapse 3+ consecutive newlines into 2 (paragraph break)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        return text.strip()

    @staticmethod
    def extract_headers_from_blocks(blocks: list) -> List[str]:
        """
        Heuristic header extraction from PyMuPDF text blocks.
        Blocks format: (x0, y0, x1, y1, "text", block_no, block_type)
        """
        headers = []
        # Common scientific section patterns
        header_pattern = re.compile(
            r'^(?:(?:\d+\.|\d+\.\d+|\b[I|V|X]+\b|\bAbstract\b|\bIntroduction\b|\bRelated Work\b|\bMethodology\b|\bArchitecture\b|\bExperiments\b|\bResults\b|\bDiscussion\b|\bConclusion\b|\bReferences\b))\s*.*$',
            re.IGNORECASE
        )

        for block in blocks:
            # block_type 0 is text
            if len(block) >= 5 and block[6] == 0 if len(block) > 6 else True:
                block_text = block[4].strip()
                lines = [line.strip() for line in block_text.split('\n') if line.strip()]
                for line in lines:
                    # Short lines that match section numbering or common academic headings
                    if len(line) < 120 and (header_pattern.match(line) or (line.isupper() and len(line) > 3)):
                        headers.append(line)
        return headers

    def parse_pdf(
        self,
        file_input: Union[str, Path, bytes],
        filename: str,
        custom_doc_id: Optional[str] = None
    ) -> Tuple[DocumentMetadata, List[PageContent]]:
        """
        Parses a PDF document into metadata and structured page contents.
        
        Args:
            file_input: File path (str or Path) or raw PDF bytes
            filename: Original file name
            custom_doc_id: Optional explicit document ID
            
        Returns:
            Tuple of (DocumentMetadata, List[PageContent])
        """
        if isinstance(file_input, (str, Path)):
            path = Path(file_input)
            if not path.exists():
                raise FileNotFoundError(f"PDF file not found at: {path}")
            with open(path, "rb") as f:
                content_bytes = f.read()
            doc = pymupdf.open(str(path))
        elif isinstance(file_input, bytes):
            content_bytes = file_input
            doc = pymupdf.open(stream=content_bytes, filetype="pdf")
        else:
            raise ValueError("file_input must be a file path or bytes")

        file_hash = self.calculate_file_hash(content_bytes)
        doc_id = custom_doc_id or f"doc_{file_hash[:12]}"
        total_pages = len(doc)
        file_size = len(content_bytes)

        logger.info("Parsing PDF '%s' (pages: %d, size: %.2f KB, id: %s)", filename, total_pages, file_size / 1024, doc_id)

        pages: List[PageContent] = []
        pdf_metadata = doc.metadata or {}

        for page_idx in range(total_pages):
            page_num = page_idx + 1
            page = doc[page_idx]

            # Extract blocks for header detection
            blocks = page.get_text("blocks")
            headers = self.extract_headers_from_blocks(blocks)

            # Extract full text
            raw_text = page.get_text("text")
            cleaned = self.clean_text(raw_text)

            pages.append(PageContent(
                page_number=page_num,
                text=cleaned,
                headers=headers,
                char_count=len(cleaned)
            ))

        doc.close()

        doc_meta = DocumentMetadata(
            doc_id=doc_id,
            filename=filename,
            file_size_bytes=file_size,
            total_pages=total_pages,
            file_hash=file_hash,
            metadata={
                "title": pdf_metadata.get("title") or filename,
                "author": pdf_metadata.get("author") or "",
                "subject": pdf_metadata.get("subject") or "",
                "producer": pdf_metadata.get("producer") or "",
            }
        )

        return doc_meta, pages
