import re
from typing import List, Optional, Set
from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.llm_factory import get_configured_llm
from app.core.logger import logger
from app.models.chat import HallucinationReport
from app.models.retrieval import ScoredChunk

FAITHFULNESS_PROMPT = """You are a rigorous Scientific Fact Checker evaluating RAG hallucination.
Given the Evidence Context and a single Claim made in an answer, determine whether the claim is fully supported by the context.

Evidence Context:
{context}

Claim: {claim}

Respond with strictly 'YES' if the claim is factually grounded in the context, or 'NO' if it contains unsupported claims or hallucinated details.
Verdict:"""

class HallucinationGrader:
    """
    Evaluates factual groundedness and flags potential hallucinations
    by checking claims against retrieved document context.
    """

    def __init__(self, llm: Optional[BaseChatModel] = None, threshold: float = 0.7):
        self.llm = llm or get_configured_llm(temperature=0.0)
        self.threshold = threshold
        if self.llm:
            self.grader_chain = ChatPromptTemplate.from_template(FAITHFULNESS_PROMPT) | self.llm | StrOutputParser()
        else:
            self.grader_chain = None

    @staticmethod
    def _extract_claims(text: str) -> List[str]:
        """Splits answer text into atomic declarative claims, stripping formatting and questions."""
        # Remove markdown headers (#, ##, ###)
        cleaned = re.sub(r'#+.*?(?:\n|$)', '', text)
        # Remove citation tags
        cleaned = re.sub(r'\[[^\]]+?,\s*p\.?\s*\d+\]', '', cleaned)
        cleaned = re.sub(r'\[\d+\]', '', cleaned)
        # Remove bullet page markers like - **Page 1**:
        cleaned = re.sub(r'-\s*\*\*Page\s*\d+\*\*.*?:', '', cleaned)
        
        # Split into sentences
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', cleaned) if len(s.strip()) > 15]
        
        claims = []
        for s in sentences:
            # Skip questions (questions are not factual claims)
            if s.endswith("?"):
                continue
            # Skip meta introductory statements
            lower = s.lower()
            if any(lower.startswith(prefix) for prefix in [
                "based on", "here is", "according to", "in summary", "research synthesis"
            ]):
                continue
            claims.append(s)

        return claims

    @staticmethod
    def _heuristic_check(claim: str, context_tokens: Set[str]) -> bool:
        """
        Token-overlap and entity containment heuristic:
        Verifies that non-stopword tokens and specific entities in claim exist in context.
        """
        claim_tokens = set(re.findall(r'\b[A-Za-z0-9_-]{3,}\b', claim.lower()))
        if not claim_tokens:
            return True

        # Stop words to ignore in grounding ratio
        stopwords = {
            "the", "and", "for", "with", "that", "this", "from", "were", "have", "been",
            "which", "also", "their", "more", "than", "they", "will", "into", "about"
        }
        substantive_tokens = claim_tokens - stopwords
        if not substantive_tokens:
            return True

        matched = substantive_tokens.intersection(context_tokens)
        overlap_ratio = len(matched) / len(substantive_tokens)
        return overlap_ratio >= 0.40

    def grade(
        self,
        answer: str,
        retrieved_chunks: List[ScoredChunk]
    ) -> HallucinationReport:
        """
        Evaluates the generated answer against the retrieved evidence chunks.
        
        Args:
            answer: Generated response string
            retrieved_chunks: Chunks provided to the synthesis engine
            
        Returns:
            HallucinationReport containing faithfulness score and verification lists
        """
        if not retrieved_chunks:
            return HallucinationReport(
                is_grounded=False,
                faithfulness_score=0.0,
                ungrounded_claims=[answer[:150]],
                summary="No retrieved context available to substantiate claims."
            )

        claims = self._extract_claims(answer)
        if not claims:
            return HallucinationReport(
                is_grounded=True,
                faithfulness_score=1.0,
                verified_claims=[],
                ungrounded_claims=[],
                summary="Answer contains no substantive claims requiring verification."
            )

        full_context_text = "\n".join(sc.chunk.content for sc in retrieved_chunks)
        context_tokens = set(re.findall(r'\b[A-Za-z0-9_-]{3,}\b', full_context_text.lower()))

        verified_claims: List[str] = []
        ungrounded_claims: List[str] = []

        for claim in claims:
            is_supported = False
            if self.grader_chain:
                try:
                    verdict = self.grader_chain.invoke({
                        "context": full_context_text[:2500],
                        "claim": claim
                    }).strip().upper()
                    is_supported = "YES" in verdict
                except Exception as e:
                    logger.warning("LLM grader error: %s. Falling back to heuristic.", e)
                    is_supported = self._heuristic_check(claim, context_tokens)
            else:
                is_supported = self._heuristic_check(claim, context_tokens)

            if is_supported:
                verified_claims.append(claim)
            else:
                ungrounded_claims.append(claim)

        total = len(claims)
        faithfulness = len(verified_claims) / total if total > 0 else 1.0
        is_grounded = faithfulness >= self.threshold

        summary = (
            f"Grounding check PASSED: {len(verified_claims)}/{total} claims substantiated (faithfulness: {faithfulness:.2f})"
            if is_grounded else
            f"Grounding check FLAGGED: {len(ungrounded_claims)}/{total} claims ungrounded (faithfulness: {faithfulness:.2f})"
        )

        logger.info("Hallucination check complete: %s", summary)

        return HallucinationReport(
            is_grounded=is_grounded,
            faithfulness_score=round(faithfulness, 2),
            verified_claims=verified_claims,
            ungrounded_claims=ungrounded_claims,
            summary=summary
        )
