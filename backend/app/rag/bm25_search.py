import pickle
import re
from pathlib import Path
from typing import Dict, List, Optional
from rank_bm25 import BM25Okapi

from app.core.config import settings
from app.core.logger import logger
from app.models.document import DocumentChunk
from app.models.retrieval import ScoredChunk

class BM25SearchEngine:
    """Production BM25 lexical search engine with persistent disk serialization."""

    def __init__(self, storage_dir: Optional[Path] = None, in_memory: bool = False):
        self.in_memory = in_memory
        self.storage_dir = storage_dir or settings.resolved_bm25_path
        self.index_file = self.storage_dir / "bm25_state.pkl"
        
        self.chunks_by_id: Dict[str, DocumentChunk] = {}
        self.chunk_ids: List[str] = []
        self.corpus_tokens: List[List[str]] = []
        self.bm25: Optional[BM25Okapi] = None

        if not self.in_memory:
            self.storage_dir.mkdir(parents=True, exist_ok=True)
            self._load_from_disk()

    @staticmethod
    def tokenize(text: str) -> List[str]:
        """Simple, fast regex-based lexical tokenizer."""
        return re.findall(r'\b\w+\b', text.lower())

    def _save_to_disk(self) -> None:
        """Persists indexed chunks and pre-tokenized corpus to disk."""
        if self.in_memory:
            return
        try:
            with open(self.index_file, "wb") as f:
                pickle.dump({
                    "chunks_by_id": self.chunks_by_id,
                    "chunk_ids": self.chunk_ids,
                    "corpus_tokens": self.corpus_tokens
                }, f)
            logger.info("Saved BM25 state to: %s (%d chunks)", self.index_file, len(self.chunk_ids))
        except Exception as e:
            logger.error("Failed to persist BM25 state: %s", e)

    def _load_from_disk(self) -> None:
        """Loads cached index from disk if available."""
        if self.index_file.exists():
            try:
                with open(self.index_file, "rb") as f:
                    data = pickle.load(f)
                    self.chunks_by_id = data.get("chunks_by_id", {})
                    self.chunk_ids = data.get("chunk_ids", [])
                    self.corpus_tokens = data.get("corpus_tokens", [])
                    if self.corpus_tokens:
                        self.bm25 = BM25Okapi(self.corpus_tokens)
                logger.info("Loaded BM25 index from disk: %d chunks restored.", len(self.chunk_ids))
            except Exception as e:
                logger.warning("Could not restore BM25 state: %s", e)

    def index_chunks(self, chunks: List[DocumentChunk]) -> int:
        """
        Indexes new chunks into the BM25 lexical engine and updates state.
        
        Args:
            chunks: List of DocumentChunk instances
            
        Returns:
            Total chunks currently indexed
        """
        if not chunks:
            return len(self.chunk_ids)

        for chunk in chunks:
            # Overwrite or append
            if chunk.chunk_id in self.chunks_by_id:
                idx = self.chunk_ids.index(chunk.chunk_id)
                self.chunks_by_id[chunk.chunk_id] = chunk
                self.corpus_tokens[idx] = self.tokenize(chunk.content)
            else:
                self.chunks_by_id[chunk.chunk_id] = chunk
                self.chunk_ids.append(chunk.chunk_id)
                self.corpus_tokens.append(self.tokenize(chunk.content))

        # Re-build BM25Okapi model
        if self.corpus_tokens:
            self.bm25 = BM25Okapi(self.corpus_tokens)

        self._save_to_disk()
        logger.info("Indexed %d chunks into BM25 (total index size: %d).", len(chunks), len(self.chunk_ids))
        return len(self.chunk_ids)

    def search(
        self,
        query: str,
        top_k: int = 15,
        doc_ids: Optional[List[str]] = None
    ) -> List[ScoredChunk]:
        """
        Calculates BM25 lexical relevance scores for the query.
        
        Args:
            query: User search query
            top_k: Top candidates to return
            doc_ids: Optional document filter
            
        Returns:
            List of ScoredChunk models
        """
        if not self.bm25 or not self.chunk_ids:
            return []

        tokenized_query = self.tokenize(query)
        if not tokenized_query:
            return []

        doc_scores = self.bm25.get_scores(tokenized_query)
        
        scored_candidates: List[ScoredChunk] = []
        for idx, score in enumerate(doc_scores):
            if score <= 0:
                continue

            chunk_id = self.chunk_ids[idx]
            chunk = self.chunks_by_id[chunk_id]

            if doc_ids and chunk.doc_id not in doc_ids:
                continue

            scored_candidates.append(ScoredChunk(
                chunk=chunk,
                sparse_score=float(score),
                final_score=float(score),
                retrieval_method="sparse"
            ))

        # Sort descending by BM25 score
        scored_candidates.sort(key=lambda x: x.sparse_score or 0.0, reverse=True)
        return scored_candidates[:top_k]

    def delete_by_doc_id(self, doc_id: str) -> None:
        """Removes all chunks associated with a document and updates index."""
        retained_ids = []
        retained_tokens = []
        retained_dict = {}

        for idx, cid in enumerate(self.chunk_ids):
            chunk = self.chunks_by_id[cid]
            if chunk.doc_id != doc_id:
                retained_ids.append(cid)
                retained_tokens.append(self.corpus_tokens[idx])
                retained_dict[cid] = chunk

        self.chunk_ids = retained_ids
        self.corpus_tokens = retained_tokens
        self.chunks_by_id = retained_dict

        if self.corpus_tokens:
            self.bm25 = BM25Okapi(self.corpus_tokens)
        else:
            self.bm25 = None

        self._save_to_disk()
        logger.info("Deleted doc_id '%s' from BM25 index. Remaining: %d", doc_id, len(self.chunk_ids))

    def count(self) -> int:
        """Returns the total number of documents indexed."""
        return len(self.chunk_ids)
