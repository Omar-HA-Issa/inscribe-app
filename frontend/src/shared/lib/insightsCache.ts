/**
 * Client-side cache for document insights
 * Prevents unnecessary regeneration when switching between documents
 */

import { InsightResponse } from './insightsApi';

interface CacheEntry {
  data: InsightResponse;
  timestamp: number;
}

// In-memory cache with 30-minute TTL
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const insightsCache = new Map<string, CacheEntry>();

/**
 * Get cached insights for a document
 */
export function getCachedInsights(documentId: string): InsightResponse | null {
  const entry = insightsCache.get(documentId);

  if (!entry) {
    return null;
  }

  const now = Date.now();
  const age = now - entry.timestamp;

  // If cache is expired, remove it
  if (age > CACHE_TTL) {
    insightsCache.delete(documentId);
    return null;
  }

  return entry.data;
}

/**
 * Cache insights for a document
 */
export function setCachedInsights(documentId: string, data: InsightResponse): void {
  insightsCache.set(documentId, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clear cache for a specific document
 */
export function clearDocumentCache(documentId: string): void {
  insightsCache.delete(documentId);
}

/**
 * Clear all cached insights
 */
export function clearAllInsightsCache(): void {
  insightsCache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats() {
  const now = Date.now();
  const stats = {
    totalEntries: insightsCache.size,
    entries: Array.from(insightsCache.entries()).map(([docId, entry]) => ({
      documentId: docId,
      age: `${Math.round((now - entry.timestamp) / 1000)}s`,
      insightCount: entry.data.insights.length,
    })),
  };
  return stats;
}
