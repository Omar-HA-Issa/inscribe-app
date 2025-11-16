import { api } from './apiClient';

export interface Insight {
  title: string;
  description: string;
  confidence: 'High' | 'Medium' | 'Low';
  category: 'risk' | 'opportunity' | 'anomaly' | 'pattern';
  evidence: string[];
  impact: string;
}

export interface InsightResponse {
  insights: Insight[];
  generatedAt: string;
  documentCount: number;
  cached?: boolean;
}

export async function generateDocumentInsights(
  documentId: string,
  forceRegenerate: boolean = false
): Promise<InsightResponse> {
  return api.post<InsightResponse>(`/api/insights/document/${documentId}`, { forceRegenerate });
}

export async function generateCrossDocumentInsights(
  documentIds: string[],
  forceRegenerate: boolean = false
): Promise<InsightResponse> {
  return api.post<InsightResponse>('/api/insights/cross-document', { documentIds, forceRegenerate });
}