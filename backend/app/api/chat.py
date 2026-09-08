import asyncio
import json
import time
from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException, status
from sse_starlette.sse import EventSourceResponse

from app.core.logger import logger
from app.models.chat import ChatRequest, ChatResponse, Citation, HallucinationReport
from app.services.container import container

router = APIRouter(prefix="/api/chat", tags=["Research Chat"])

@router.post("", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """
    Standard JSON endpoint for multi-document reasoning, citation extraction,
    and hallucination verification.
    """
    if not req.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query string cannot be empty."
        )

    start_time = time.perf_counter()
    try:
        chat_history = [m.model_dump() for m in req.chat_history]
        final_state = container.reasoning_graph.execute(
            query=req.query,
            session_id=req.session_id or "default_session",
            chat_history=chat_history,
            doc_ids=req.doc_ids,
            use_hyde=req.use_hyde,
            temperature=req.temperature,
            response_style=req.response_style or "direct",
            detail_level=req.detail_level or "concise"
        )

        latency = (time.perf_counter() - start_time) * 1000

        citations = [Citation(**c) for c in final_state.get("citations", [])]
        hallucination_rep = (
            HallucinationReport(**final_state["hallucination_report"])
            if final_state.get("hallucination_report") else None
        )

        return ChatResponse(
            answer=final_state.get("answer", ""),
            citations=citations,
            sources=final_state.get("sources", []),
            reasoning_steps=final_state.get("reasoning_steps", []),
            is_grounded=final_state.get("is_grounded", True),
            faithfulness_score=final_state.get("faithfulness_score", 1.0),
            hallucination_report=hallucination_rep,
            execution_time_ms=round(latency, 2)
        )

    except Exception as e:
        logger.error("Chat execution error: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while synthesizing the answer: {str(e)}"
        )

@router.post("/stream")
async def chat_stream_endpoint(req: ChatRequest):
    """
    Server-Sent Events (SSE) streaming endpoint delivering real-time tokens,
    reasoning trails, verified citation spans, and hallucination scores.
    """
    if not req.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query string cannot be empty."
        )

    async def event_generator() -> AsyncGenerator[dict, None]:
        start_time = time.perf_counter()
        yield {
            "event": "status",
            "data": json.dumps({"message": "Initializing multi-stage research pipeline..."})
        }
        await asyncio.sleep(0.01)

        try:
            chat_history = [m.model_dump() for m in req.chat_history]
            
            # Execute reasoning graph
            final_state = container.reasoning_graph.execute(
                query=req.query,
                session_id=req.session_id or "default_session",
                chat_history=chat_history,
                doc_ids=req.doc_ids,
                use_hyde=req.use_hyde,
                temperature=req.temperature
            )

            # 1. Stream reasoning trail steps
            for step in final_state.get("reasoning_steps", []):
                yield {
                    "event": "reasoning",
                    "data": json.dumps({"step": step})
                }
                await asyncio.sleep(0.02)

            # 2. Stream answer content in progressive chunks
            answer = final_state.get("answer", "")
            words = answer.split(" ")
            chunk_size = 4
            for i in range(0, len(words), chunk_size):
                sub_text = " ".join(words[i:i + chunk_size]) + " "
                yield {
                    "event": "token",
                    "data": json.dumps({"token": sub_text})
                }
                await asyncio.sleep(0.015)

            # 3. Stream verified citations
            yield {
                "event": "citations",
                "data": json.dumps(final_state.get("citations", []))
            }

            # 4. Stream sources
            yield {
                "event": "sources",
                "data": json.dumps(final_state.get("sources", []))
            }

            # 5. Stream hallucination report
            if final_state.get("hallucination_report"):
                yield {
                    "event": "report",
                    "data": json.dumps(final_state["hallucination_report"])
                }

            # 6. Stream final done event
            total_elapsed = round((time.perf_counter() - start_time) * 1000, 2)
            yield {
                "event": "done",
                "data": json.dumps({
                    "execution_time_ms": total_elapsed,
                    "is_grounded": final_state.get("is_grounded", True),
                    "faithfulness_score": final_state.get("faithfulness_score", 1.0)
                })
            }

        except Exception as e:
            logger.error("SSE stream error: %s", e, exc_info=True)
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }

    return EventSourceResponse(event_generator())
