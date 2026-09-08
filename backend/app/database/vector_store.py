import uuid
from typing import List, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest_models
from sentence_transformers import SentenceTransformer

from app.core.config import settings
from app.core.logger import logger
from app.models.document import DocumentChunk
from app.models.retrieval import ScoredChunk

class QdrantVectorStore:
    """Production Qdrant dense vector database wrapper with payload filtering."""

    COLLECTION_NAME = "research_chunks"

    def __init__(self, in_memory: bool = False, custom_path: Optional[str] = None):
        self.in_memory = in_memory
        
        if in_memory:
            self.client = QdrantClient(location=":memory:")
            logger.info("Initialized in-memory Qdrant instance.")
        else:
            storage_path = custom_path or str(settings.resolved_qdrant_path)
            self.client = QdrantClient(path=storage_path)
            logger.info("Initialized persistent local Qdrant instance at: %s", storage_path)

        self.embedding_model = SentenceTransformer(
            model_name_or_path=settings.EMBEDDING_MODEL,
            device=settings.EMBEDDING_DEVICE
        )
        self.embedding_dim = int(self.embedding_model.get_embedding_dimension())
        self._ensure_collection()

    def _ensure_collection(self) -> None:
        """Creates the Qdrant collection and payload indices if they do not exist."""
        collections = [c.name for c in self.client.get_collections().collections]
        if self.COLLECTION_NAME not in collections:
            self.client.create_collection(
                collection_name=self.COLLECTION_NAME,
                vectors_config=rest_models.VectorParams(
                    size=self.embedding_dim,
                    distance=rest_models.Distance.COSINE
                )
            )
            logger.info("Created Qdrant collection '%s' with dimension %d.", self.COLLECTION_NAME, self.embedding_dim)

            # Payload indices are only needed in server mode; suppress warning in local mode
            if not self.in_memory:
                try:
                    for field in ["doc_id", "filename", "page_number"]:
                        self.client.create_payload_index(
                            collection_name=self.COLLECTION_NAME,
                            field_name=field,
                            field_schema=rest_models.PayloadSchemaType.KEYWORD
                        )
                    logger.info("Created payload indexes on 'doc_id', 'filename', and 'page_number'.")
                except Exception as e:
                    logger.debug("Payload index skipped: %s", e)

    @staticmethod
    def _chunk_id_to_uuid(chunk_id: str) -> str:
        """Converts arbitrary chunk_id string to deterministic UUID for Qdrant point ID."""
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id))

    def upsert_chunks(self, chunks: List[DocumentChunk], batch_size: int = 64) -> int:
        """
        Embeds chunk contents and stores vectors with rich metadata payloads.
        
        Args:
            chunks: List of DocumentChunk models
            batch_size: Number of chunks to process per embedding batch
            
        Returns:
            Count of successfully upserted points
        """
        if not chunks:
            return 0

        total_upserted = 0
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            texts = [c.content for c in batch]
            
            # Generate dense embeddings
            embeddings = self.embedding_model.encode(texts, convert_to_numpy=True, show_progress_bar=False)

            points = []
            for chunk, embedding in zip(batch, embeddings):
                point_id = self._chunk_id_to_uuid(chunk.chunk_id)
                payload = {
                    "chunk_id": chunk.chunk_id,
                    "doc_id": chunk.doc_id,
                    "filename": chunk.filename,
                    "page_number": chunk.page_number,
                    "chunk_index": chunk.chunk_index,
                    "content": chunk.content,
                    "token_count": chunk.token_count,
                    "section_header": chunk.section_header,
                    "metadata": chunk.metadata
                }
                points.append(rest_models.PointStruct(
                    id=point_id,
                    vector=embedding.tolist(),
                    payload=payload
                ))

            self.client.upsert(
                collection_name=self.COLLECTION_NAME,
                points=points
            )
            total_upserted += len(points)

        logger.info("Upserted %d points to Qdrant collection '%s'.", total_upserted, self.COLLECTION_NAME)
        return total_upserted

    def search(
        self,
        query: str,
        top_k: int = 15,
        doc_ids: Optional[List[str]] = None
    ) -> List[ScoredChunk]:
        """
        Performs cosine similarity search for dense semantic retrieval.
        
        Args:
            query: Natural language query
            top_k: Maximum candidate chunks to retrieve
            doc_ids: Optional document filter
            
        Returns:
            List of ScoredChunk models
        """
        query_vector = self.embedding_model.encode(query, convert_to_numpy=True, show_progress_bar=False).tolist()

        query_filter = None
        if doc_ids:
            query_filter = rest_models.Filter(
                must=[
                    rest_models.FieldCondition(
                        key="doc_id",
                        match=rest_models.MatchAny(any=doc_ids)
                    )
                ]
            )

        # In modern qdrant-client >= 1.10+, query_points or search can be used
        try:
            hits = self.client.query_points(
                collection_name=self.COLLECTION_NAME,
                query=query_vector,
                query_filter=query_filter,
                limit=top_k,
                with_payload=True
            ).points
        except Exception:
            hits = self.client.search(
                collection_name=self.COLLECTION_NAME,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=top_k,
                with_payload=True
            )

        results: List[ScoredChunk] = []
        for hit in hits:
            payload = hit.payload
            chunk = DocumentChunk(
                chunk_id=payload["chunk_id"],
                doc_id=payload["doc_id"],
                filename=payload["filename"],
                page_number=payload["page_number"],
                chunk_index=payload["chunk_index"],
                content=payload["content"],
                token_count=payload.get("token_count", 0),
                section_header=payload.get("section_header"),
                metadata=payload.get("metadata", {})
            )
            score = float(hit.score)
            results.append(ScoredChunk(
                chunk=chunk,
                dense_score=score,
                final_score=score,
                retrieval_method="dense"
            ))

        return results

    def delete_by_doc_id(self, doc_id: str) -> None:
        """Deletes all chunks belonging to a document from Qdrant."""
        self.client.delete(
            collection_name=self.COLLECTION_NAME,
            points_selector=rest_models.FilterSelector(
                filter=rest_models.Filter(
                    must=[
                        rest_models.FieldCondition(
                            key="doc_id",
                            match=rest_models.MatchValue(value=doc_id)
                        )
                    ]
                )
            )
        )
        logger.info("Deleted chunks for doc_id '%s' from Qdrant.", doc_id)

    def count(self) -> int:
        """Returns total vectors stored in the collection."""
        return self.client.count(collection_name=self.COLLECTION_NAME).count
