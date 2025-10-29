import { api } from './api';

export interface ChatSource {
  document: string;
  chunk_index: number;
  similarity: number;
}

export interface ChatRequest {
  query: string;
  limit?: number;
  similarityThreshold?: number;
  documentId?: string;
}

export interface ChatResponse {
  success: boolean;
  answer: string;
  sources: ChatSource[];
  chunksUsed: number;
}

export const chatApi = {
  async sendMessage(
    query: string,
    limit: number = 5,
    similarityThreshold: number = 0.7,
    documentId?: string
  ): Promise<ChatResponse> {
    const body: ChatRequest = {
      query,
      limit,
      similarityThreshold,
    };

    // Only include documentId if it's provided
    if (documentId) {
      body.documentId = documentId;
    }

    return api.request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};