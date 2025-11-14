import { api } from './apiClient';

export interface Insight {
  title: string;
  description: string;
  confidence: 'High' | 'Medium' | 'Low';
  category: 'correlation' | 'pattern' | 'anomaly' | 'opportunity' | 'risk';
  evidence: string[];
  impact: string;
}

export interface InsightResponse {
  insights: Insight[];
  generatedAt: string;
  documentCount: number;
}

export async function generateDocumentInsights(documentId: string): Promise<InsightResponse> {
  return api.post<InsightResponse>(`/api/insights/document/${documentId}`);
}

export async function generateCrossDocumentInsights(documentIds: string[]): Promise<InsightResponse> {
  return api.post<InsightResponse>('/api/insights/cross-document', { documentIds });
}