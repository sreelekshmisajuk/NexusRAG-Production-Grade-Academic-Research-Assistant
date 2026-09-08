export type ProcessingStatus = 'Uploaded' | 'Processing' | 'Processed' | 'Failed';

export interface DocumentMetadata {
  title: string;
  author?: string;
  subject?: string;
  producer?: string;
  publicationYear?: number;
  doi?: string;
}

export interface DocumentChunk {
  chunk_id: string;
  doc_id: string;
  filename: string;
  page_number: number;
  chunk_index: number;
  content: string;
  token_count: number;
}

export interface Document {
  doc_id: string;
  filename: string;
  file_size_bytes: number;
  total_pages: number;
  total_chunks: number;
  status: ProcessingStatus;
  uploaded_at: string;
  collection: string;
  metadata: DocumentMetadata;
  file_path?: string;
  abstract?: string;
  summary?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  sessionCount: number;
  queryCount: number;
  createdAt: string;
  updatedAt: string;
  color?: string;
}
