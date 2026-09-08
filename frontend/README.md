# 🤖 RAG Research Assistant — Frontend Application

> **Tagline**: Research smarter. Ask questions. Follow the evidence.

A production-grade React + TypeScript research workspace built with Vite, Tailwind CSS, Lucide React, and TanStack Query. Engineered specifically for academic paper exploration, cross-document reasoning, hybrid retrieval visibility (Dense + BM25), physical page-level PDF citations, and hallucination guardrail verification.

---

## 🚀 1. How to Install

Ensure [Node.js](https://nodejs.org/) (v18+ recommended) is installed.

```bash
cd frontend
npm install
```

---

## ⚡ 2. How to Run

### Development Mode
```bash
npm run dev
```
The application will launch on: **[http://localhost:5173](http://localhost:5173)**

### Production Build
```bash
npm run build
npm run preview
```

---

## 🔑 3. Environment Variables

Create or configure `.env` in the `frontend/` directory:

```env
# Optional API Base URL override.
# When omitted, Vite proxies /api requests to http://127.0.0.1:8000 automatically.
VITE_API_BASE_URL=""
```

> **Security Note**: Never expose LLM API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, etc.) in the frontend. All model secrets belong exclusively in `backend/.env`.

---

## 🏗️ 4. Frontend Architecture

The codebase follows a modular, feature-oriented architecture:

```text
frontend/src/
├── components/
│   ├── layout/               # Global shell: Sidebar, Header, MainLayout
│   ├── documents/            # DocumentCard, DocumentTable, DocumentSelector, UploadModal
│   ├── chat/                 # ChatInput, ChatMessage, Citation, ProgressIndicator, RetrievalDetails
│   ├── sources/              # SourcesPanel, SourceCard
│   ├── pdf/                  # PdfViewer, PdfToolbar
│   ├── analytics/            # MetricCard, QueryChart, RetrievalChart (Recharts)
│   ├── evaluation/           # EvaluationMetrics, ExperimentTable, EvaluationChart
│   └── common/               # LoadingState, EmptyState, ErrorState, StatusBadge
│
├── pages/
│   ├── Dashboard.tsx         # /dashboard — Literature KPI metrics, prominent query bar & recent docs
│   ├── Library.tsx           # /library — Complete document management, filters, and collections
│   ├── Research.tsx          # /research — 3-column evidence-grounded chat workspace
│   ├── PdfViewerPage.tsx     # /documents/:documentId — Academic PDF viewer with citation highlights
│   ├── History.tsx           # /history — Saved research sessions with search, rename, & reopen
│   ├── Analytics.tsx         # /analytics — RAG telemetry, recall@5, MRR, latency, and query charts
│   ├── Evaluation.tsx        # /evaluation — Faithfulness, relevance, and experiment ablation matrix
│   ├── Verification.tsx      # /verification — Grounding audit breaking answers into atomic claims
│   ├── Collections.tsx       # /collections — Thematic research groups with session & paper counts
│   └── Settings.tsx          # /settings — Model configurations, hybrid retrieval weights, and theme
│
├── context/
│   ├── AppContext.tsx        # Global selection, persistent settings, theme, and search filter
│   └── ToastContext.tsx      # Toast notifications system
│
├── services/
│   ├── api.ts                # Centralized typed HTTP client with error handling
│   ├── documentApi.ts        # Document fetch, upload, and collection management
│   ├── researchApi.ts        # Query dispatch, multistage progress, and chat session history
│   ├── evaluationApi.ts      # RAG benchmark experiments and claim verification reports
│   └── analyticsApi.ts       # Telemetry metrics, query distributions, and latency percentiles
│
├── types/                    # Strongly-typed TypeScript domain models
├── data/mockData.ts          # Realistic academic research papers and benchmark baselines
├── App.tsx                   # Central router definition and QueryClientProvider
└── main.tsx                  # Application entrypoint
```

---

## 🔌 5. API Integration Points

The frontend communicates with backend services through the service layer in `src/services/`:

| Endpoint | Method | Service Function | Description |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | `checkBackendHealth()` | Backend system status & configured models |
| `/api/documents` | `GET` | `documentApi.getDocuments()` | Lists all indexed research PDFs |
| `/api/documents/upload` | `POST` | `documentApi.uploadDocument()` | Ingests PDF with chunking and embeddings |
| `/api/documents/:id` | `GET` | `documentApi.getDocument(id)` | Document details and physical page stats |
| `/api/documents/:id` | `DELETE` | `documentApi.deleteDocument(id)` | Removes document from Qdrant and BM25 |
| `/api/documents/:id/pdf` | `GET` | `getPdfUrl(id, page)` | Streams physical PDF file at specific page |
| `/api/chat` | `POST` | `researchApi.query()` | Synchronous reasoning graph execution |
| `/api/chat/stream` | `POST` | `streamChatQuery()` | Real-time SSE streaming of tokens & stages |
| `/api/collections` | `GET` / `POST` | `documentApi.getCollections()` | Manages thematic paper collections |

---

## 🗺️ 6. Available Routes

* **`/dashboard`**: High-level literature metrics, direct research prompt input, and recent papers.
* **`/library`**: Complete document repository with search, status filters, collection filters, and grid/table views.
* **`/research`**: Primary 3-column research environment (Document selection, Interactive chat with markdown/citations, and Evidence sources panel).
* **`/documents/:documentId`**: Full academic PDF research viewer with TOC, page zoom, text search, and citation jumping (`?page=X&highlight=...`).
* **`/history`**: Searchable research session logs with renaming, deletion, and resumption.
* **`/analytics`**: Comprehensive telemetry dashboard with Recharts visualizations, Recall@5, and MRR.
* **`/evaluation`**: Reference-based RAG benchmarking suite comparing Baseline vs. Hybrid vs. Hybrid + Reranker.
* **`/verification`**: Deep claim-level hallucination audit displaying exact physical quote evidence.
* **`/collections`**: Thematic grouping of papers with dedicated research triggers.
* **`/settings`**: Model provider controls (Gemini, OpenAI, Groq, Ollama), hybrid weights, and theme preferences.

---

## 🔄 7. How to Replace Mock Data with FastAPI Backend

1. **Automatic Fallback Architecture**:
   The service layer (`src/services/`) is configured to probe live FastAPI endpoints first (`/api/documents`, `/api/chat`, etc.).
   - If the backend is running, live data is retrieved, parsed, and displayed seamlessly.
   - If endpoints are unreachable or the backend is offline, the service layer automatically falls back to rich academic mock data without breaking the UI.

2. **Connecting to Custom Backend URL**:
   If your backend is hosted on a remote server or alternate port, configure `VITE_API_BASE_URL` in `frontend/.env`:
   ```env
   VITE_API_BASE_URL="http://your-backend-domain.com"
   ```

3. **Switching Chat Execution to SSE Streaming**:
   In `src/pages/Research.tsx`, switch from `researchApi.query()` to `streamChatQuery()` in `src/services/api.js` to enable token-by-token streaming as tokens are generated by your LLM provider.
