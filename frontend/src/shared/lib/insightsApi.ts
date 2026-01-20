import { api } from './api';
import { getCachedInsights, setCachedInsights, clearDocumentCache } from './insightsCache';

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
  // Check client-side cache first (unless force regenerating)
  if (!forceRegenerate) {
    const cached = getCachedInsights(documentId);
    if (cached) {
      // Mark as cached and return
      return { ...cached, cached: true };
    }
  }

  // If force regenerating, clear the cache
  if (forceRegenerate) {
    clearDocumentCache(documentId);
  }

  // Fetch from API
  const response = await api.post<InsightResponse>(`/api/insights/document/${documentId}`, { forceRegenerate });

  // Cache the response
  setCachedInsights(documentId, response);

  return response;
}

export async function generateCrossDocumentInsights(
  documentIds: string[],
  forceRegenerate: boolean = false
): Promise<InsightResponse> {
  // Create a composite cache key from sorted document IDs
  const cacheKey = documentIds.sort().join('|');

  // Check client-side cache first (unless force regenerating)
  if (!forceRegenerate) {
    const cached = getCachedInsights(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
  }

  // If force regenerating, clear the cache
  if (forceRegenerate) {
    clearDocumentCache(cacheKey);
  }

  // Fetch from API
  const response = await api.post<InsightResponse>('/api/insights/cross-document', { documentIds, forceRegenerate });

  // Cache the response
  setCachedInsights(cacheKey, response);

  return response;
}