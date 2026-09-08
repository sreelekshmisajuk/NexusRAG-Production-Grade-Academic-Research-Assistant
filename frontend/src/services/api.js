/**
 * API Service for NexusRAG Backend
 * Provides typed methods for document ingestion, retrieval, and SSE chat streaming.
 */

const BASE_URL = ''; // Routed via Vite proxy to http://127.0.0.1:8000

export async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const json = JSON.parse(errorText);
      if (json.detail) errorMessage = json.detail;
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) return { status: 'offline' };
    return await res.json();
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
}

export async function fetchDocuments() {
  const res = await fetch(`${BASE_URL}/api/documents`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch documents' }));
    throw new Error(err.detail || 'Failed to fetch documents');
  }
  return await res.json();
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Document upload failed');
  }
  return await res.json();
}

export async function deleteDocument(docId) {
  const res = await fetch(`${BASE_URL}/api/documents/${docId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Delete failed' }));
    throw new Error(err.detail || 'Failed to delete document');
  }
  return await res.json();
}

export function getPdfUrl(docId, page = 1) {
  return `${BASE_URL}/api/documents/${docId}/pdf#page=${page}`;
}

/**
 * Consumes SSE Stream from /api/chat/stream
 */
export async function streamChatQuery({
  query,
  conversationHistory = [],
  documentIds = null,
  retrievalSettings = {},
  onEvent,
  signal,
}) {
  const payload = {
    query,
    conversation_history: conversationHistory,
    document_ids: documentIds && documentIds.length > 0 ? documentIds : null,
    retrieval_settings: {
      top_k: retrievalSettings.topK || 5,
      dense_weight: retrievalSettings.alpha !== undefined ? retrievalSettings.alpha : 0.5,
      enable_hybrid: retrievalSettings.enableHybrid !== false,
      enable_reranker: retrievalSettings.enableReranker !== false,
      enable_hyde: retrievalSettings.enableHyDE || false,
    },
  };

  const response = await fetch(`${BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Streaming chat failed' }));
    throw new Error(err.detail || `Chat request failed with HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    // SSE frames are separated by double newlines (\n\n or \r\n\r\n)
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() || '';

    for (const frame of frames) {
      if (!frame.trim()) continue;

      let eventType = 'message';
      let dataStr = '';

      const lines = frame.split(/\r?\n/);
      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataStr = line.slice(5).trim();
        }
      }

      if (!dataStr) continue;

      try {
        const parsed = JSON.parse(dataStr);
        if (!onEvent) continue;

        if (eventType === 'reasoning') {
          onEvent({ type: 'reasoning_step', step: parsed.step });
        } else if (eventType === 'token') {
          onEvent({ type: 'token', text: parsed.token });
        } else if (eventType === 'citations') {
          const citeList = Array.isArray(parsed) ? parsed : [parsed];
          for (const c of citeList) {
            onEvent({ type: 'citation', citation: c });
          }
        } else if (eventType === 'report') {
          onEvent({ type: 'guardrail', report: parsed });
        } else if (eventType === 'done') {
          onEvent({
            type: 'final_response',
            content: parsed.answer,
            reasoning_steps: parsed.reasoning_steps,
            citations: parsed.citations,
            guardrail_report: parsed.hallucination_report,
          });
        } else {
          onEvent({ type: eventType, data: parsed });
        }
      } catch (e) {
        console.warn('Failed to parse SSE data:', dataStr, e);
      }
    }
  }
}
