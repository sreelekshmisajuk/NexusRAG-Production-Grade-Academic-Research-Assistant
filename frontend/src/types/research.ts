export interface Citation {
  id: number;
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  snippet: string;
  relevanceScore: number;
  verified: boolean;
  highlightText?: string;
}

export interface Source {
  id: string;
  citationIndex: number;
  documentId: string;
  documentTitle: string;
  author?: string;
  pageNumber: number;
  relevanceScore: number;
  content: string;
  verified: boolean;
}

export interface RetrievalDetails {
  originalQuery: string;
  rewrittenQueries: string[];
  strategy: 'Hybrid Search' | 'Semantic Search' | 'BM25 Lexical';
  semanticScore: number;
  bm25Score: number;
  documentsRetrieved: number;
  afterReranking: number;
  finalContextChunks: number;
  rerankerModel: string;
  denseLatencyMs: number;
  sparseLatencyMs: number;
  rerankLatencyMs: number;
  totalTimeMs: number;
}

export type GenerationStage =
  | 'idle'
  | 'rewriting'
  | 'retrieving'
  | 'reranking'
  | 'generating'
  | 'verifying'
  | 'completed';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];
  retrievalDetails?: RetrievalDetails;
  sources?: Source[];
  faithfulnessScore?: number;
  feedback?: 'helpful' | 'not_helpful' | null;
  stage?: GenerationStage;
}

export interface ResearchSession {
  id: string;
  title: string;
  queryCount: number;
  createdAt: string;
  updatedAt: string;
  documentIds: string[];
  collectionId?: string;
  messages?: ChatMessage[];
}

export type ResponseStyle = 'direct' | 'bullets' | 'table' | 'detailed' | 'executive';
export type DetailLevel = 'concise' | 'standard' | 'comprehensive';

export interface ResultCustomization {
  style: ResponseStyle;
  detailLevel: DetailLevel;
  showTelemetry: boolean;
  showCitations: boolean;
  showGroundingScore: boolean;
}

export interface ResearchQueryPayload {
  query: string;
  document_ids?: string[];
  collection_id?: string;
  conversation_history?: Array<{ role: string; content: string }>;
  customization?: ResultCustomization;
}
