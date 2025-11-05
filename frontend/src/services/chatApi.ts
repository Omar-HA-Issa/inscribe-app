import { api } from './api';

export interface ChatSource {
  document: string;
  document_id: string;
  chunksUsed: number;
  topSimilarity: number;
}

export interface ChatRequest {
  question: string;
  limit?: number;
  similarityThreshold?: number;
  documentId?: string;
  selectedDocumentIds?: string[];
}

export interface ChatResponse {
  success: boolean;
  answer: string;
  sources: ChatSource[];
  chunksUsed: number;
}

export const chatApi = {
  async sendMessage(
      question: string,
      limit: number = 5,
      similarityThreshold: number = 0.7,
      documentId?: string,
      selectedDocumentIds?: string[]
  ): Promise<ChatResponse> {
    const body: ChatRequest = {
      question,
      limit,
      similarityThreshold,
    };

    if (documentId) {
      body.documentId = documentId;
    }

    if (selectedDocumentIds && selectedDocumentIds.length > 0) {
      body.selectedDocumentIds = selectedDocumentIds; // ← Make sure this is here!
    }

    console.log('📤 Frontend sending:', JSON.stringify(body)); // ← Add this

    return api.request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};