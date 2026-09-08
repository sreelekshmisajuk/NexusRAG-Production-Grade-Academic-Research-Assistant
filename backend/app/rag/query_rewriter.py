import re
from typing import Dict, List, Optional
from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.llm_factory import get_configured_llm
from app.core.logger import logger
from app.models.retrieval import QueryRewriteResult

REWRITE_PROMPT = """You are an advanced AI research assistant optimizing queries for academic paper retrieval.
Given the user query (and optional conversation history), perform query decomposition and expansion.

Generate:
1. An unambiguous, self-contained standalone search query.
2. 2-3 complementary keyword-rich sub-queries targeting different facets (methodology, experiments, metrics).

Format your output strictly as numbered lines:
1. [Standalone Query]
2. [Sub-query 1]
3. [Sub-query 2]

Conversation History:
{chat_history}

User Query: {query}
"""

HYDE_PROMPT = """You are an expert academic researcher.
Write a short, authoritative 2-3 sentence hypothetical excerpt from a scientific paper that directly answers the following question.
Do not include conversational filler; write directly as if excerpted from a published research paper:

Question: {query}
Excerpt:"""

class QueryRewriter:
    """Decomposes, expands, and generates hypothetical embeddings (HyDE) for user queries."""

    def __init__(self, llm: Optional[BaseChatModel] = None):
        self.llm = llm or get_configured_llm(temperature=0.2)
        if self.llm:
            self.rewrite_chain = ChatPromptTemplate.from_template(REWRITE_PROMPT) | self.llm | StrOutputParser()
            self.hyde_chain = ChatPromptTemplate.from_template(HYDE_PROMPT) | self.llm | StrOutputParser()
        else:
            self.rewrite_chain = None
            self.hyde_chain = None

    @staticmethod
    def _rule_based_fallback(query: str) -> List[str]:
        """
        Heuristic query decomposition and expansion when LLM is offline or not configured:
        - Splits conjunctions ('and', 'vs', 'compared to', ';')
        - Expands academic terminology (objective -> aim, purpose, research question)
        - Generates keyword-focused permutations
        """
        sub_queries = [query.strip()]

        # Academic synonym expansions
        synonym_map = {
            "objective": "aim purpose goal research question",
            "objectives": "aims purposes goals research questions",
            "aim": "objective purpose goal research question",
            "purpose": "objective aim goal research question",
            "goal": "objective aim purpose target",
            "method": "methodology data collection participants procedure",
            "methodology": "method research design data collection procedure",
            "participants": "sample subjects students interviewees",
            "finding": "results outcomes analysis evidence",
            "findings": "results outcomes data analysis evidence",
            "results": "findings outcomes analysis",
            "conclusion": "summary discussion implications",
        }

        query_lower = query.lower()
        expanded_terms = []
        for word, syn in synonym_map.items():
            if re.search(rf'\b{word}\b', query_lower):
                expanded_terms.append(syn)

        if expanded_terms:
            sub_queries.append(f"{query.strip()} {' '.join(expanded_terms)}")

        # Split comparison questions
        split_patterns = [r'\band\b', r'\bversus\b', r'\bvs\.?\b', r'\bcompared to\b', r';']
        for pat in split_patterns:
            parts = re.split(pat, query, flags=re.IGNORECASE)
            if len(parts) > 1:
                for p in parts:
                    cleaned_p = p.strip()
                    if len(cleaned_p) > 10 and cleaned_p not in sub_queries:
                        sub_queries.append(cleaned_p)

        # Extract technical noun phrases / alphanumeric terms (e.g. "RAG", "BERT-base")
        terms = re.findall(r'\b[A-Za-z0-9_-]{3,}\b', query)
        if len(terms) >= 3:
            kw_query = " ".join(terms)
            if kw_query.lower() != query.lower() and kw_query not in sub_queries:
                sub_queries.append(kw_query)

        return sub_queries[:4]

    def rewrite(
        self,
        query: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        generate_hyde: bool = False
    ) -> QueryRewriteResult:
        """
        Rewrites and decomposes the incoming query into multiple high-precision search variants.
        
        Args:
            query: User's original prompt
            chat_history: Prior conversational turns [{"role": "user"|"assistant", "content": "..."}]
            generate_hyde: If True, also synthesizes a hypothetical document passage
            
        Returns:
            QueryRewriteResult containing list of search queries and optional HyDE text
        """
        formatted_history = "None"
        if chat_history:
            formatted_history = "\n".join(
                f"{msg.get('role', 'user').capitalize()}: {msg.get('content', '')}"
                for msg in chat_history[-4:]
            )

        rewritten: List[str] = []
        hyde_text: Optional[str] = None

        if self.rewrite_chain:
            try:
                raw_response = self.rewrite_chain.invoke({
                    "query": query,
                    "chat_history": formatted_history
                })
                # Parse numbered list
                lines = [line.strip() for line in raw_response.split("\n") if line.strip()]
                for line in lines:
                    cleaned = re.sub(r'^\d+[\.\)]\s*', '', line).strip()
                    if cleaned and cleaned not in rewritten:
                        rewritten.append(cleaned)

                if generate_hyde and self.hyde_chain:
                    hyde_text = self.hyde_chain.invoke({"query": query}).strip()

            except Exception as e:
                logger.warning("LLM query rewrite encountered error: %s. Using heuristic fallback.", e)
                rewritten = self._rule_based_fallback(query)
        else:
            rewritten = self._rule_based_fallback(query)

        # Ensure original query is always retained
        if query not in rewritten:
            rewritten.insert(0, query)

        is_decomposed = len(rewritten) > 1

        logger.info(
            "Query rewrite for '%s' generated %d queries (HyDE: %s)",
            query, len(rewritten), bool(hyde_text)
        )

        return QueryRewriteResult(
            original_query=query,
            rewritten_queries=rewritten,
            hyde_passage=hyde_text,
            is_decomposed=is_decomposed
        )
