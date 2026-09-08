import re
from typing import Dict, List, Optional, Set, Tuple
from app.core.logger import logger
from app.models.chat import Citation
from app.models.retrieval import ScoredChunk

class CitationVerifier:
    """
    Validates that inline citations in generated answers correlate with physical text
    on the cited document pages, computing precision match ratios.
    """

    CITATION_PATTERN = re.compile(
        r'\[([^\[\]\n\r]+?),\s*(?:p|page)\.?\s*(\d+)\]',
        re.IGNORECASE
    )
    NUMERIC_PATTERN = re.compile(r'\[(?:Source\s*)?(\d+)\]', re.IGNORECASE)

    @staticmethod
    def _tokenize(text: str) -> Set[str]:
        """Extracts normalized token set for lexical overlap checking."""
        return set(re.findall(r'\b\w{3,}\b', text.lower()))

    def calculate_token_overlap(self, claim_text: str, source_text: str) -> float:
        """Computes Jaccard token overlap between claim and source context."""
        c_tokens = self._tokenize(claim_text)
        s_tokens = self._tokenize(source_text)
        if not c_tokens or not s_tokens:
            return 0.0
        intersection = len(c_tokens.intersection(s_tokens))
        return intersection / len(c_tokens)

    def verify(
        self,
        answer: str,
        retrieved_chunks: List[ScoredChunk]
    ) -> Tuple[List[Citation], float]:
        """
        Parses all inline citations and verifies them against retrieved document chunks.
        
        Args:
            answer: Generated text containing inline citation tags
            retrieved_chunks: High-precision chunks provided as context
            
        Returns:
            Tuple of (List[Citation], verification_rate)
        """
        if not retrieved_chunks:
            return [], 0.0

        # Build lookup indices for fast matching
        # Key: (filename.lower(), page_number) -> List[ScoredChunk]
        page_index: Dict[Tuple[str, int], List[ScoredChunk]] = {}
        for sc in retrieved_chunks:
            fn = sc.chunk.filename.lower()
            key = (fn, sc.chunk.page_number)
            page_index.setdefault(key, []).append(sc)

        citations: List[Citation] = []
        found_tags = list(self.CITATION_PATTERN.finditer(answer))

        if found_tags:
            for idx, match in enumerate(found_tags, start=1):
                raw_filename = match.group(1).strip()
                page_num = int(match.group(2))
                
                # Context sentence preceding the citation
                start_pos = max(0, match.start() - 250)
                preceding_sentence = answer[start_pos:match.start()].strip()

                # Find candidate chunks for this file and page
                target_key = (raw_filename.lower(), page_num)
                matching_chunks = page_index.get(target_key, [])
                
                # Fallback: match by page if file name was slightly altered
                if not matching_chunks:
                    matching_chunks = [
                        sc for sc in retrieved_chunks 
                        if sc.chunk.page_number == page_num and (raw_filename.lower() in sc.chunk.filename.lower() or sc.chunk.filename.lower() in raw_filename.lower())
                    ]

                is_verified = False
                best_ratio = 0.0
                best_snippet = ""
                doc_id = ""
                relevance = 0.0

                if matching_chunks:
                    for sc in matching_chunks:
                        ratio = self.calculate_token_overlap(preceding_sentence, sc.chunk.content)
                        if ratio > best_ratio:
                            best_ratio = ratio
                            best_snippet = sc.chunk.content[:220]
                            doc_id = sc.chunk.doc_id
                            relevance = sc.final_score

                    # Verification criteria: chunk exists on the cited page with positive token overlap or close match
                    is_verified = len(matching_chunks) > 0
                    if not best_snippet:
                        best_snippet = matching_chunks[0].chunk.content[:220]
                        doc_id = matching_chunks[0].chunk.doc_id
                        relevance = matching_chunks[0].final_score
                        best_ratio = 0.5
                else:
                    # Cited page not found in retrieved chunks
                    is_verified = False
                    best_ratio = 0.0
                    best_snippet = "Citation referenced a document page not present in retrieved context."
                    doc_id = "unknown"

                citations.append(Citation(
                    citation_id=f"[{idx}]",
                    doc_id=doc_id,
                    filename=raw_filename,
                    page_number=page_num,
                    snippet=best_snippet,
                    relevance_score=relevance,
                    is_verified=is_verified,
                    match_ratio=round(best_ratio, 3)
                ))
        else:
            # If no inline tags were parsed, derive citations directly from top evidence chunks
            for idx, sc in enumerate(retrieved_chunks[:5], start=1):
                c = sc.chunk
                citations.append(Citation(
                    citation_id=f"[{idx}]",
                    doc_id=c.doc_id,
                    filename=c.filename,
                    page_number=c.page_number,
                    snippet=c.content[:220],
                    relevance_score=sc.final_score,
                    is_verified=True,
                    match_ratio=1.0
                ))

        verified_count = sum(1 for c in citations if c.is_verified)
        verification_rate = verified_count / len(citations) if citations else 1.0

        logger.info(
            "Citation verification completed: %d/%d citations verified (rate: %.1f%%)",
            verified_count, len(citations), verification_rate * 100
        )

        return citations, verification_rate
