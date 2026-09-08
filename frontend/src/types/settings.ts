export interface SystemSettings {
  // Model settings
  llmProvider: 'gemini' | 'openai' | 'groq' | 'ollama';
  llmModel: string;
  embeddingModel: string;
  embeddingDevice: 'cpu' | 'cuda' | 'mps';
  rerankerModel: string;

  // Retrieval settings
  retrievalStrategy: 'hybrid' | 'semantic' | 'bm25';
  topK: number;
  rerankTopK: number;
  semanticWeight: number; // 0-100
  bm25Weight: number; // 0-100
  enableQueryRewriting: boolean;
  enableReranking: boolean;
  enableCitationVerification: boolean;
  enableHallucinationDetection: boolean;

  // Interface settings
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  streamResponses: boolean;
}

export interface AnalyticsSummary {
  totalDocuments: number;
  totalQueries: number;
  totalCollections: number;
  averageLatencySeconds: number;
  citationAccuracy: number;
  recallAt5: number;
  precisionAt5: number;
  mrr: number;
  queriesOverTime: Array<{ date: string; queries: number; uniqueUsers: number }>;
  latencyBreakdown: Array<{ step: string; latencyMs: number }>;
  queryCategories: Array<{ category: string; count: number; percentage: number }>;
  topDocuments: Array<{ id: string; title: string; citations: number; queries: number }>;
}

export const defaultSettings: SystemSettings = {
  llmProvider: 'gemini',
  llmModel: 'gemini-1.5-flash',
  embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
  embeddingDevice: 'cpu',
  rerankerModel: 'ms-marco-MiniLM-L-6-v2',
  retrievalStrategy: 'hybrid',
  topK: 10,
  rerankTopK: 5,
  semanticWeight: 70,
  bm25Weight: 30,
  enableQueryRewriting: true,
  enableReranking: true,
  enableCitationVerification: true,
  enableHallucinationDetection: true,
  theme: 'dark',
  compactMode: false,
  streamResponses: true,
};
