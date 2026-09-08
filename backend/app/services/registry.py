import json
from pathlib import Path
from typing import Dict, List, Optional
from app.core.config import settings
from app.core.logger import logger
from app.models.document import DocumentMetadata

class DocumentRegistry:
    """Manages persistent metadata registry of indexed documents on disk."""

    def __init__(self, registry_file: Optional[Path] = None):
        self.registry_file = registry_file or (settings.resolved_data_dir / "documents_registry.json")
        self.documents: Dict[str, dict] = {}
        self._load()

    def _load(self) -> None:
        if self.registry_file.exists():
            try:
                with open(self.registry_file, "r", encoding="utf-8") as f:
                    self.documents = json.load(f)
                logger.info("Loaded document registry: %d documents.", len(self.documents))
            except Exception as e:
                logger.warning("Could not load document registry: %s", e)
                self.documents = {}

    def _save(self) -> None:
        try:
            with open(self.registry_file, "w", encoding="utf-8") as f:
                json.dump(self.documents, f, indent=2, default=str)
        except Exception as e:
            logger.error("Failed to save document registry: %s", e)

    def register_document(
        self,
        meta: DocumentMetadata,
        total_chunks: int,
        file_path: Optional[Path] = None
    ) -> dict:
        doc_entry = {
            "doc_id": meta.doc_id,
            "filename": meta.filename,
            "file_size_bytes": meta.file_size_bytes,
            "total_pages": meta.total_pages,
            "total_chunks": total_chunks,
            "file_hash": meta.file_hash,
            "file_path": str(file_path) if file_path else "",
            "uploaded_at": meta.uploaded_at.isoformat(),
            "metadata": meta.metadata
        }
        self.documents[meta.doc_id] = doc_entry
        self._save()
        logger.info("Registered document '%s' (id: %s) in catalog.", meta.filename, meta.doc_id)
        return doc_entry

    def list_documents(self) -> List[dict]:
        return list(self.documents.values())

    def get_document(self, doc_id: str) -> Optional[dict]:
        return self.documents.get(doc_id)

    def delete_document(self, doc_id: str) -> bool:
        if doc_id in self.documents:
            entry = self.documents.pop(doc_id)
            self._save()
            # If saved file exists, delete it
            if entry.get("file_path"):
                fp = Path(entry["file_path"])
                if fp.exists():
                    try:
                        fp.unlink()
                        logger.info("Deleted physical PDF file: %s", fp)
                    except Exception as e:
                        logger.warning("Failed to delete physical file: %s", e)
            return True
        return False

document_registry = DocumentRegistry()
