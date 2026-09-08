export interface RAGEvaluationMetrics {
  faithfulness: number;
  answerRelevance: number;
  contextRelevance: number;
  contextRecall: number;
  citationAccuracy: number;
  noiseSensitivity: number;
  hallucinationRate: number;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  date: string;
  retriever: string;
  reranker: string;
  metrics: RAGEvaluationMetrics;
  datasetSize: {
    questions: number;
    documents: number;
    evaluated: number;
  };
}

export type ClaimVerificationStatus = 'Supported' | 'Partially Supported' | 'Unsupported';

export interface VerificationClaim {
  id: string;
  claimNumber: number;
  statement: string;
  status: ClaimVerificationStatus;
  confidence: number;
  evidenceSnippet?: string;
  sourceDocId?: string;
  sourceDocTitle?: string;
  sourcePage?: number;
  explanation: string;
}

export interface VerificationResult {
  id: string;
  query: string;
  answer: string;
  overallGroundingScore: number;
  claims: VerificationClaim[];
  createdAt: string;
}
