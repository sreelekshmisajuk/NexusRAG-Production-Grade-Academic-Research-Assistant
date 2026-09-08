# 🤖 NexusRAG — Production-Grade Academic Research Assistant

A state-of-the-art Research Assistant system for academic papers and technical PDFs, engineered for precision, multi-document reasoning, verifiable page-level citations, and hallucination prevention.

---

## 🌟 Key Architecture & Capabilities

```
User Query
    │
    ▼
Query Rewriting & HyDE ───► Generates multi-queries & hypothetical answers
    │
    ▼
Hybrid Retrieval ─────────► Dense Semantic (Qdrant) + Sparse Lexical (Rank-BM25)
    │
    ▼
Reciprocal Rank Fusion ───► RRF(d) = α / (k + rank_dense) + (1-α) / (k + rank_sparse)
    │
    ▼
FlashRank Cross-Encoder ──► ONNX ms-marco-MiniLM reranker for top candidate ranking
    │
    ▼
LangGraph State Machine ──► Multi-document synthesis & structured reasoning trace
    │
    ▼
Citation Verification ────► Validates physical page quotes with Jaccard overlap
    │
    ▼
Hallucination Guardrail ──► Deconstructs claims & scores factual faithfulness
    │
    ▼
React Frontend + PDF ─────► Interactive pills [Paper, p. 3] jump to exact PDF pages!
```

---

## 🚀 Quick Start Guide

### 1. Launch Backend API (FastAPI)
Double-click `start_backend.bat` or run:
```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API docs available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Launch Frontend (Vite + React)
Double-click `start_frontend.bat` or run:
```powershell
cd frontend
npm.cmd run dev
```
Web application opens at: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Running Backend Automated Tests
All 20 backend integration tests can be run at any time:
```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests/
```

---

## ⚙️ Configuration
Configure model providers in [backend/.env](file:///c:/Users/sreeh/OneDrive/Desktop/Production-RAG-Research-Assistant/backend/.env):
- **LLM Providers Supported**: Google Gemini (`GEMINI_API_KEY`), OpenAI (`OPENAI_API_KEY`), Groq (`GROQ_API_KEY`), or local Ollama.
- **Embedded Storage**:
  - Dense Vectors: `./data/qdrant`
  - Sparse Index: `./data/bm25/bm25_state.pkl`
  - Uploaded Papers: `./data/documents`
>>>>>>> 775278c (Initial commit: NexusRAG Production-Grade Academic Research Assistant)
