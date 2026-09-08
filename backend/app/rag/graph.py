import re
import time
from typing import Any, Dict, List, Optional
from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langgraph.graph import StateGraph, END

from app.core.llm_factory import get_configured_llm
from app.core.logger import logger
from app.models.chat import Citation
from app.models.retrieval import ScoredChunk
from app.rag.citation_verifier import CitationVerifier
from app.rag.hallucination_grader import HallucinationGrader
from app.rag.retrieval_pipeline import RetrievalPipeline
from app.rag.state import RAGGraphState

SYNTHESIS_SYSTEM_PROMPT = """You are a focused, authoritative AI Research Assistant synthesizing evidence from scientific literature.

Strict Core Rules:
1. Answer ONLY what the researcher asks. Do NOT include pleasantries, conversational filler, or introductory preambles (e.g., avoid "Based on the provided documents...", "Here is an analysis...").
2. Do NOT add unsolicited background history or repetitive summary conclusions unless explicitly requested.
3. Every factual claim MUST be followed by an exact citation in the format: [{filename}, p. {page}] (e.g., [{filename}, p. 3]).
4. If the provided context lacks sufficient evidence to answer the question, state that directly in one concise sentence without speculating.

Researcher Output Format Preferences:
{format_instructions}

Relevant Evidence Chunks:
{context}

Conversation History:
{chat_history}

Researcher Question: {query}

Synthesized Result:"""

def _get_format_instructions(style: str = "direct", detail_level: str = "concise") -> str:
    instructions = []
    
    if style == "direct":
        instructions.append("- Provide a direct, concise, to-the-point answer answering precisely what was asked.")
        instructions.append("- Cut all unnecessary filler and background; prioritize immediate clarity.")
    elif style == "bullets":
        instructions.append("- Present the answer strictly as clean, structured bullet points.")
        instructions.append("- Each bullet must state a key finding or fact followed by its exact citation.")
    elif style == "table":
        instructions.append("- Format comparisons, methods, mechanisms, or metrics in a clear Markdown table with headers.")
        instructions.append("- Include a column for Source & Page citation.")
        instructions.append("- Follow the table with 2-3 concise bullet points summarizing takeaways.")
    elif style == "executive":
        instructions.append("- Executive Summary: 2-3 high-level sentences directly answering the core inquiry.")
        instructions.append("- Follow with 3 bulleted key takeaways with page citations.")
    elif style == "detailed":
        instructions.append("- Provide a comprehensive academic analysis examining methodology, mechanisms, and nuances from the literature.")
    else:
        instructions.append("- Answer directly, concisely, and factually without introductory fluff.")

    if detail_level == "concise":
        instructions.append("- Detail Level: High conciseness. Keep length tight and focused.")
    elif detail_level == "comprehensive":
        instructions.append("- Detail Level: Comprehensive. Elaborate on specifics, architectures, and empirical results.")
    else:
        instructions.append("- Detail Level: Standard. Balanced and clear.")

    return "\n".join(instructions)

class RAGReasoningGraph:
    """
    LangGraph State Machine orchestrating Multi-Document Reasoning,
    Query Decomposition, Cross-Encoder Retrieval, and Citation Extraction.
    """

    def __init__(
        self,
        retrieval_pipeline: Optional[RetrievalPipeline] = None,
        llm: Optional[BaseChatModel] = None,
        citation_verifier: Optional[CitationVerifier] = None,
        hallucination_grader: Optional[HallucinationGrader] = None
    ):
        self.pipeline = retrieval_pipeline or RetrievalPipeline()
        self.explicit_llm_provided = llm is not None or "llm" in locals() and llm is None
        self._llm_arg_passed = llm is not None
        self.llm = llm if self._llm_arg_passed else get_configured_llm(temperature=0.0)
        self.citation_verifier = citation_verifier or CitationVerifier()
        self.hallucination_grader = hallucination_grader or HallucinationGrader(llm=self.llm)
        
        if self.llm:
            self.synthesis_chain = ChatPromptTemplate.from_template(SYNTHESIS_SYSTEM_PROMPT) | self.llm | StrOutputParser()
        else:
            self.synthesis_chain = None

        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(RAGGraphState)

        workflow.add_node("analyze_query", self._analyze_query_node)
        workflow.add_node("retrieve_evidence", self._retrieve_evidence_node)
        workflow.add_node("synthesize_multidoc", self._synthesize_multidoc_node)
        workflow.add_node("extract_citations", self._extract_citations_node)

        workflow.set_entry_point("analyze_query")
        workflow.add_edge("analyze_query", "retrieve_evidence")
        workflow.add_edge("retrieve_evidence", "synthesize_multidoc")
        workflow.add_edge("synthesize_multidoc", "extract_citations")
        workflow.add_edge("extract_citations", END)

        return workflow.compile()

    # -----------------------------------------------------------------
    # Graph Node 1: Query Analysis & Decomposition
    # -----------------------------------------------------------------
    def _analyze_query_node(self, state: RAGGraphState) -> Dict[str, Any]:
        query = state["query"]
        history = state.get("chat_history", [])
        use_hyde = state.get("use_hyde", False)

        rewrite_result = self.pipeline.query_rewriter.rewrite(
            query=query,
            chat_history=history,
            generate_hyde=use_hyde
        )

        reasoning = state.get("reasoning_steps", [])
        if rewrite_result.is_decomposed:
            step = f"Decomposed query into {len(rewrite_result.rewritten_queries)} targeted search facets: {', '.join(rewrite_result.rewritten_queries[:3])}"
        else:
            step = f"Analyzed standalone research query: '{query}'"
        reasoning.append(step)

        return {
            "decomposed_queries": rewrite_result.rewritten_queries,
            "reasoning_steps": reasoning
        }

    # -----------------------------------------------------------------
    # Graph Node 2: Multi-Stage Precision Retrieval
    # -----------------------------------------------------------------
    def _retrieve_evidence_node(self, state: RAGGraphState) -> Dict[str, Any]:
        query = state["query"]
        history = state.get("chat_history", [])
        doc_ids = state.get("doc_ids")
        use_hyde = state.get("use_hyde", False)

        pipeline_result = self.pipeline.retrieve(
            query=query,
            chat_history=history,
            use_hyde=use_hyde,
            doc_ids=doc_ids
        )

        reranked = pipeline_result.reranked_chunks
        reasoning = state.get("reasoning_steps", [])
        reasoning.append(
            f"Retrieved {pipeline_result.candidate_chunks_count} hybrid candidates (Qdrant + BM25), reranked to {len(reranked)} precision chunks."
        )

        # Build formatted context block with clear citation provenance
        context_parts = []
        for idx, scored in enumerate(reranked, start=1):
            c = scored.chunk
            header = f"[Source {idx} | File: {c.filename} | Page: {c.page_number} | Section: {c.section_header or 'General'}]"
            context_parts.append(f"{header}\n{c.content}\n")

        formatted_context = "\n---\n".join(context_parts)

        return {
            "retrieved_chunks": reranked,
            "formatted_context": formatted_context,
            "reasoning_steps": reasoning
        }

    # -----------------------------------------------------------------
    # Graph Node 3: Multi-Document Synthesis
    # -----------------------------------------------------------------
    def _synthesize_multidoc_node(self, state: RAGGraphState) -> Dict[str, Any]:
        query = state["query"]
        history = state.get("chat_history", [])
        context = state.get("formatted_context", "")
        chunks = state.get("retrieved_chunks", [])
        reasoning = state.get("reasoning_steps", [])

        style = state.get("response_style", "direct") or "direct"
        detail_level = state.get("detail_level", "concise") or "concise"
        format_instructions = _get_format_instructions(style, detail_level)

        if not chunks:
            reasoning.append("No relevant chunks retrieved from index.")
            return {
                "answer": "No relevant evidence was found in the uploaded documents to answer this question.",
                "reasoning_steps": reasoning
            }

        # Format history string
        formatted_history = "None"
        if history:
            formatted_history = "\n".join(
                f"{m.get('role', 'user').capitalize()}: {m.get('content', '')}"
                for m in history[-4:]
            )

        # Dynamically check if an LLM API key has been added at runtime
        if not self.synthesis_chain and not self.explicit_llm_provided:
            runtime_llm = get_configured_llm(temperature=0.0)
            if runtime_llm:
                self.llm = runtime_llm
                self.synthesis_chain = ChatPromptTemplate.from_template(SYNTHESIS_SYSTEM_PROMPT) | self.llm | StrOutputParser()
                self.hallucination_grader.llm = runtime_llm

        answer = ""
        if self.synthesis_chain:
            try:
                first_chunk = chunks[0].chunk
                answer = self.synthesis_chain.invoke({
                    "context": context,
                    "chat_history": formatted_history,
                    "query": query,
                    "filename": first_chunk.filename,
                    "page": first_chunk.page_number,
                    "format_instructions": format_instructions
                }).strip()
                reasoning.append(f"Generated synthesis tailored to style '{style}' ({detail_level}).")
            except Exception as e:
                logger.warning("LLM synthesis error: %s. Using structured fallback synthesis.", e)
                answer = self._generate_fallback_synthesis(query, chunks, style, detail_level)
                reasoning.append("Generated direct evidence synthesis (fallback mode).")
        else:
            answer = self._generate_fallback_synthesis(query, chunks, style, detail_level)
            reasoning.append("Generated direct evidence synthesis (offline mode).")

        return {
            "answer": answer,
            "reasoning_steps": reasoning
        }

    @staticmethod
    def _clean_sentence(text: str) -> str:
        """Cleans footnote numbers, table indices, and broken citations from text."""
        # Strip leading footnote numbers like [1], (1), 1., *, -
        cleaned = re.sub(r'^\s*(?:\[\d+\]|\(\d+\)|\d+\.|\*|-)\s*', '', text)
        # Strip trailing unclosed or broken citations like (Dörnyei, 2007, p. or (Author, 2016)
        cleaned = re.sub(r'\s*\([^)]*?(?:19\d\d|20\d\d|p\.|\bet al\b)[^)]*$', '', cleaned)
        cleaned = re.sub(r'\s*\([A-Za-z\s&]+,?\s*\d{0,4}[^)]*$', '', cleaned)
        cleaned = cleaned.strip()
        if cleaned and not cleaned.endswith((".", "!", "?")):
            cleaned += "."
        return cleaned

    @staticmethod
    def _generate_fallback_synthesis(
        query: str,
        chunks: List[ScoredChunk],
        style: str = "direct",
        detail_level: str = "concise"
    ) -> str:
        """
        Creates a clean, conversational synthesis tailored to the researcher's preferred format
        without dumping raw document headers, broken citations, or irrelevant boilerplate.
        """
        if not chunks:
            return "No relevant evidence was found in the indexed documents for this inquiry."

        # 1. Extract substantive query tokens
        stop_words = {
            "what", "is", "are", "the", "of", "in", "and", "a", "to", "for", "with",
            "on", "at", "from", "by", "about", "as", "into", "through", "during",
            "before", "after", "above", "below", "to", "from", "up", "down", "in",
            "out", "over", "under", "again", "further", "then", "once", "here",
            "there", "when", "where", "why", "how", "all", "any", "both", "each",
            "few", "more", "most", "other", "some", "such", "no", "nor", "not",
            "only", "own", "same", "so", "than", "too", "very", "s", "t", "can",
            "will", "just", "don", "should", "now", "tell", "give", "show", "explain",
            "find", "summarize", "list", "describe", "was", "were"
        }
        query_tokens = set(re.findall(r'[a-zA-Z0-9_-]+', query.lower())) - stop_words

        # Expand query tokens with academic synonyms
        academic_synonyms = {
            "objective": {"aim", "purpose", "goal", "research", "question", "target", "explore", "investigate", "examined"},
            "objectives": {"aims", "purposes", "goals", "questions", "targets", "explores", "investigates"},
            "aim": {"objective", "purpose", "goal", "question", "investigate", "target"},
            "purpose": {"objective", "aim", "goal", "question", "explore", "examine"},
            "goal": {"objective", "aim", "purpose", "target", "needs"},
            "method": {"methodology", "data", "collection", "participants", "procedure", "interview", "sample"},
            "methodology": {"method", "design", "data", "collection", "procedure", "participants", "interview"},
            "participants": {"sample", "subjects", "students", "learners", "interviewees"},
            "finding": {"results", "outcomes", "analysis", "evidence", "demonstrated", "revealed"},
            "findings": {"results", "outcomes", "analysis", "evidence", "demonstrated", "revealed"},
            "results": {"findings", "outcomes", "analysis", "demonstrated", "revealed"},
            "limitation": {"limitations", "weaknesses", "constraints"},
            "limitations": {"weakness", "constraints", "limitations"},
            "conclusion": {"summary", "discussion", "implications", "concluded"},
        }
        expanded_tokens = set(query_tokens)
        for t in list(query_tokens):
            if t in academic_synonyms:
                expanded_tokens.update(academic_synonyms[t])

        # 2. Score individual sentences across all candidate chunks
        scored_sentences = []
        unique_docs = sorted(list({c.chunk.filename for c in chunks}))

        for sc in chunks:
            c = sc.chunk
            clean_text = c.content.replace("\n", " ").strip()
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', clean_text) if len(s.strip()) > 15]
            for s in sentences:
                s_lower = s.lower()
                s_tokens = set(re.findall(r'[a-zA-Z0-9_-]+', s_lower))
                matched_tokens = expanded_tokens.intersection(s_tokens)
                overlap_score = len(matched_tokens)
                for qt in query_tokens:
                    if qt in s_lower:
                        overlap_score += 1.5
                if overlap_score > 0:
                    scored_sentences.append((overlap_score, s, c))

        # 3. If query tokens were provided but NO sentences matched
        if query_tokens and not scored_sentences:
            doc_list = ", ".join(unique_docs[:3])
            return (
                f"The uploaded documents ({doc_list}) do not contain direct evidence related to '{query}'. "
                f"Please upload research papers discussing this topic, or configure an LLM API key (e.g. GEMINI_API_KEY) in backend/.env for AI reasoning."
            )

        # Sort sentences by match relevance descending
        scored_sentences.sort(key=lambda x: x[0], reverse=True)

        if not scored_sentences:
            for sc in chunks[:3]:
                c = sc.chunk
                clean_text = c.content.replace("\n", " ").strip()
                sents = [s.strip() for s in re.split(r'(?<=[.!?])\s+', clean_text) if len(s.strip()) > 15]
                for s in sents[:2]:
                    scored_sentences.append((1.0, s, c))

        # Deduplicate sentences while preserving top scores
        seen_texts = set()
        unique_scored = []
        for score, sent, c in scored_sentences:
            cleaned = RAGReasoningGraph._clean_sentence(sent)
            normalized = cleaned[:50].lower()
            if normalized not in seen_texts and len(cleaned) > 20:
                seen_texts.add(normalized)
                unique_scored.append((score, cleaned, c))

        if not unique_scored:
            return "No clear textual findings could be extracted for this inquiry from the uploaded documents."

        # Format according to style
        if style == "bullets":
            lead_doc = unique_scored[0][2].filename.replace('.pdf', '')
            lines = [f"Based on the investigation in **{lead_doc}**, here are the key findings directly addressing your inquiry:\n"]
            limit = 3 if detail_level == "concise" else 5
            for _, sent, c in unique_scored[:limit]:
                lines.append(f"- **Key Finding (p. {c.page_number})**: {sent} `[{c.filename}, p. {c.page_number}]`")
            return "\n".join(lines)

        if style == "table":
            lines = [
                "| Finding / Core Evidence | Source Paper | Page |",
                "| :--- | :--- | :--- |"
            ]
            limit = 3 if detail_level == "concise" else 5
            for _, sent, c in unique_scored[:limit]:
                snippet = sent[:140].strip()
                lines.append(f"| {snippet}... | `{c.filename}` | p. {c.page_number} |")
            return "\n".join(lines)

        if style == "executive":
            lead_sent = unique_scored[0][1]
            lead_chunk = unique_scored[0][2]
            lines = [
                f"**Executive Summary**: {lead_sent} `[{lead_chunk.filename}, p. {lead_chunk.page_number}]`\n",
                "**Key Takeaways**:"
            ]
            for _, sent, c in unique_scored[1:4]:
                lines.append(f"- {sent} `[{c.filename}, p. {c.page_number}]`")
            return "\n".join(lines)

        # Default: direct & cohesive conversational paragraph
        lead_chunk = unique_scored[0][2]
        lead_text = unique_scored[0][1]
        supporting_items = []
        limit = 2 if detail_level == "concise" else 4
        for _, sent, c in unique_scored[1:limit]:
            if sent != lead_text:
                supporting_items.append((sent, c))

        parts = [f"{lead_text} `[{lead_chunk.filename}, p. {lead_chunk.page_number}]`"]
        for sent, c in supporting_items:
            parts.append(f"Furthermore, {sent} `[{c.filename}, p. {c.page_number}]`")

        return " ".join(parts)

    # -----------------------------------------------------------------
    # Graph Node 4: Citation Extraction & Provenance Resolution
    # -----------------------------------------------------------------
    def _extract_citations_node(self, state: RAGGraphState) -> Dict[str, Any]:
        answer = state.get("answer", "")
        chunks = state.get("retrieved_chunks", [])
        reasoning = state.get("reasoning_steps", [])

        # 1. Run rigorous citation verification
        verified_citations, verification_rate = self.citation_verifier.verify(answer, chunks)

        # 2. Build unique sources directory
        unique_sources: Dict[str, Dict[str, Any]] = {}
        for c in verified_citations:
            if c.doc_id not in unique_sources:
                unique_sources[c.doc_id] = {
                    "doc_id": c.doc_id,
                    "filename": c.filename,
                    "referenced_pages": [c.page_number]
                }
            else:
                if c.page_number not in unique_sources[c.doc_id]["referenced_pages"]:
                    unique_sources[c.doc_id]["referenced_pages"].append(c.page_number)

        # 3. Run hallucination and factual grounding grading
        hallucination_report = self.hallucination_grader.grade(answer, chunks)

        reasoning.append(
            f"Citation verification: Extracted and verified {len(verified_citations)} citations (rate: {verification_rate * 100:.1f}%)."
        )
        reasoning.append(f"Grounding verdict: {hallucination_report.summary}")

        return {
            "citations": [c.model_dump() for c in verified_citations],
            "sources": list(unique_sources.values()),
            "reasoning_steps": reasoning,
            "is_grounded": hallucination_report.is_grounded,
            "faithfulness_score": hallucination_report.faithfulness_score,
            "hallucination_report": hallucination_report.model_dump()
        }

    def execute(
        self,
        query: str,
        session_id: str = "default_session",
        chat_history: Optional[List[Dict[str, str]]] = None,
        doc_ids: Optional[List[str]] = None,
        use_hyde: bool = False,
        temperature: float = 0.0,
        response_style: str = "direct",
        detail_level: str = "concise"
    ) -> RAGGraphState:
        """
        Executes the LangGraph research assistant state machine.
        """
        start_time = time.perf_counter()
        initial_state: RAGGraphState = {
            "query": query,
            "session_id": session_id,
            "chat_history": chat_history or [],
            "doc_ids": doc_ids,
            "use_hyde": use_hyde,
            "temperature": temperature,
            "response_style": response_style,
            "detail_level": detail_level,
            "decomposed_queries": [],
            "retrieved_chunks": [],
            "formatted_context": "",
            "answer": "",
            "citations": [],
            "sources": [],
            "reasoning_steps": [],
            "is_grounded": True,
            "faithfulness_score": 1.0,
            "hallucination_report": None
        }

        final_state = self.graph.invoke(initial_state)
        elapsed = (time.perf_counter() - start_time) * 1000
        logger.info("LangGraph reasoning execution completed in %.2f ms.", elapsed)
        return final_state
