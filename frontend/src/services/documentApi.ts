import { request } from './api';
import { Document, Collection } from '../types/document';

const COLLECTIONS_STORAGE_KEY = 'rag_assistant_collections';
const DOC_COLLECTIONS_MAP_KEY = 'rag_doc_collections_map';

function getSavedDocCollections(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DOC_COLLECTIONS_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDocCollection(docId: string, collection: string) {
  try {
    const map = getSavedDocCollections();
    map[docId] = collection;
    localStorage.setItem(DOC_COLLECTIONS_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function getStoredCollections(): Collection[] {
  try {
    const raw = localStorage.getItem(COLLECTIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [
    {
      id: 'col-general',
      name: 'General Research',
      description: 'Default collection for newly uploaded papers and technical documents.',
      documentCount: 0,
      sessionCount: 0,
      queryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#0284c7',
    },
  ];
}

function saveStoredCollections(cols: Collection[]) {
  try {
    localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(cols));
  } catch {
    // ignore
  }
}

export const documentApi = {
  async getDocuments(): Promise<Document[]> {
    let liveDocs: any[] = [];
    try {
      liveDocs = await request<any[]>('/api/documents');
    } catch {
      try {
        liveDocs = await request<any[]>('/api/v1/documents');
      } catch {
        liveDocs = [];
      }
    }

    const docColMap = getSavedDocCollections();

    const mapped: Document[] = (liveDocs || []).map((d: any) => {
      const assignedCollection = docColMap[d.doc_id] || d.collection || 'General Research';
      const cleanTitle =
        d.metadata?.title && d.metadata.title !== d.filename
          ? d.metadata.title
          : d.filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      return {
        doc_id: d.doc_id,
        filename: d.filename,
        file_size_bytes: d.file_size_bytes || 0,
        total_pages: d.total_pages || 1,
        total_chunks: d.total_chunks || 1,
        status: (d.status as any) || 'Processed',
        uploaded_at: d.uploaded_at || new Date().toISOString(),
        collection: assignedCollection,
        metadata: {
          title: cleanTitle,
          author: d.metadata?.author || 'Uploaded Author',
          ...d.metadata,
        },
        abstract:
          d.abstract ||
          `Document: ${d.filename}. Physical pages: ${d.total_pages || 1}. Chunks: ${
            d.total_chunks || 1
          }. Ingested into local Qdrant vector database and BM25 index.`,
      };
    });

    return mapped;
  },

  async getDocument(id: string): Promise<Document> {
    const raw = await request<any>(`/api/documents/${id}`);
    const docColMap = getSavedDocCollections();
    const cleanTitle =
      raw.metadata?.title && raw.metadata.title !== raw.filename
        ? raw.metadata.title
        : raw.filename?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Document';

    return {
      doc_id: raw.doc_id,
      filename: raw.filename,
      file_size_bytes: raw.file_size_bytes || 0,
      total_pages: raw.total_pages || 1,
      total_chunks: raw.total_chunks || 1,
      status: (raw.status as any) || 'Processed',
      uploaded_at: raw.uploaded_at || new Date().toISOString(),
      collection: docColMap[raw.doc_id] || raw.collection || 'General Research',
      metadata: {
        title: cleanTitle,
        author: raw.metadata?.author || 'Author',
        ...raw.metadata,
      },
      abstract: raw.abstract || `Uploaded paper: ${raw.filename}. Total pages: ${raw.total_pages || 1}.`,
    };
  },

  async uploadDocument(
    file: File,
    collection: string = 'General Research',
    onProgress?: (progress: number) => void
  ): Promise<Document> {
    if (onProgress) onProgress(20);
    const formData = new FormData();
    formData.append('file', file);

    if (onProgress) onProgress(50);
    const ingestRes = await request<any>('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });

    if (onProgress) onProgress(90);

    const docId = ingestRes.doc_id;
    saveDocCollection(docId, collection);

    if (onProgress) onProgress(100);

    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    return {
      doc_id: docId,
      filename: ingestRes.filename || file.name,
      file_size_bytes: file.size,
      total_pages: ingestRes.total_pages || 1,
      total_chunks: ingestRes.total_chunks || 1,
      status: 'Processed',
      uploaded_at: new Date().toISOString(),
      collection,
      metadata: {
        title: cleanTitle,
        author: 'Uploaded Document',
        publicationYear: new Date().getFullYear(),
      },
      abstract: `Ingested ${file.name}. Processed with ${ingestRes.total_chunks || 1} chunks in Qdrant and BM25 indices.`,
    };
  },

  async deleteDocument(id: string): Promise<{ success: boolean }> {
    await request<any>(`/api/documents/${id}`, {
      method: 'DELETE',
    });
    return { success: true };
  },

  async deleteDocuments(ids: string[]): Promise<{ success: boolean }> {
    await Promise.all(ids.map((id) => this.deleteDocument(id)));
    return { success: true };
  },

  async getCollections(): Promise<Collection[]> {
    const stored = getStoredCollections();
    const docs = await this.getDocuments();

    // Dynamically update document counts based on actual docs in library
    const updated = stored.map((col) => {
      const count = docs.filter((d) => d.collection === col.name).length;
      return {
        ...col,
        documentCount: count,
      };
    });

    // Also include any collection names found on documents that aren't in stored list
    const existingNames = new Set(updated.map((c) => c.name));
    for (const doc of docs) {
      if (doc.collection && !existingNames.has(doc.collection)) {
        existingNames.add(doc.collection);
        const count = docs.filter((d) => d.collection === doc.collection).length;
        updated.push({
          id: `col-${doc.collection.toLowerCase().replace(/\s+/g, '-')}`,
          name: doc.collection,
          description: `Research collection for ${doc.collection}`,
          documentCount: count,
          sessionCount: 0,
          queryCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          color: '#06b6d4',
        });
      }
    }

    saveStoredCollections(updated);
    return updated;
  },

  async createCollection(name: string, description: string = ''): Promise<Collection> {
    const cols = getStoredCollections();
    const newCol: Collection = {
      id: `col-${Date.now()}`,
      name,
      description: description || `Collection for ${name}`,
      documentCount: 0,
      sessionCount: 0,
      queryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#0ea5e9',
    };
    cols.push(newCol);
    saveStoredCollections(cols);
    return newCol;
  },

  async deleteCollection(id: string): Promise<{ success: boolean }> {
    const cols = getStoredCollections().filter((c) => c.id !== id);
    saveStoredCollections(cols);
    return { success: true };
  },
};
