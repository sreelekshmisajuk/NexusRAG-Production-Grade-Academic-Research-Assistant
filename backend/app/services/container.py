from app.database.vector_store import QdrantVectorStore
from app.rag.bm25_search import BM25SearchEngine
from app.rag.citation_verifier import CitationVerifier
from app.rag.graph import RAGReasoningGraph
from app.rag.hallucination_grader import HallucinationGrader
from app.rag.hybrid_retriever import HybridRetriever
from app.rag.query_rewriter import QueryRewriter
from app.rag.reranker import FlashRankReranker
from app.rag.retrieval_pipeline import RetrievalPipeline
from app.services.chunker import ChunkerService
from app.services.document_service import DocumentService
from app.services.pdf_parser import PDFParserService
from app.services.registry import document_registry

class ServiceContainer:
    """Singleton container managing lifecycle of RAG and document services."""

    def __init__(self):
        # Database & Search Engines
        self.vector_store = QdrantVectorStore()
        self.bm25_engine = BM25SearchEngine()
        self.hybrid_retriever = HybridRetriever(
            vector_store=self.vector_store,
            bm25_engine=self.bm25_engine
        )

        # Retrieval Components
        self.query_rewriter = QueryRewriter()
        self.reranker = FlashRankReranker()
        self.retrieval_pipeline = RetrievalPipeline(
            hybrid_retriever=self.hybrid_retriever,
            query_rewriter=self.query_rewriter,
            reranker=self.reranker
        )

        # Guardrails & Reasoning Graph
        self.citation_verifier = CitationVerifier()
        self.hallucination_grader = HallucinationGrader()
        self.reasoning_graph = RAGReasoningGraph(
            retrieval_pipeline=self.retrieval_pipeline,
            citation_verifier=self.citation_verifier,
            hallucination_grader=self.hallucination_grader
        )

        # Document Ingestion Services
        self.pdf_parser = PDFParserService()
        self.chunker = ChunkerService()
        self.document_service = DocumentService(
            parser=self.pdf_parser,
            chunker=self.chunker
        )
        self.registry = document_registry

container = ServiceContainer()
