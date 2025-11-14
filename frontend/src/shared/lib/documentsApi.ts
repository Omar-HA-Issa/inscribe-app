import { api } from "./api";

export interface Document {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  metadata?: Record<string, unknown>;
  summary?: string;
  created_at: string;
  updated_at: string;
}

export interface SummaryResult {
  overview: string;
  keyFindings: string[];
  keywords: string[];
  metadata: {
    wordCount?: number;
    pageCount?: number;
    readingTime?: number;
  };
}

interface DocumentsResponse {
  documents: Document[];
}

interface SummaryResponse {
  success: boolean;
  summary: SummaryResult;
}

/**
 * Fetch all documents for the authenticated user
 */
export const fetchDocuments = async (): Promise<Document[]> => {
  const response = await api.get<DocumentsResponse>("/api/documents");
  return response.documents;
};

/**
 * Delete a document by ID
 */
export const deleteDocument = async (documentId: string): Promise<void> => {
  await api.delete(`/api/documents/${documentId}`);
};

/**
 * Get or generate summary for a document
 */
export const getDocumentSummary = async (
  documentId: string,
  regenerate = false
): Promise<SummaryResult> => {
  const endpoint = `/api/documents/${documentId}/summary${regenerate ? "?regenerate=true" : ""}`;
  const response = await api.get<SummaryResponse>(endpoint);
  return response.summary;
};