/**
 * Document API utilities with proper types and error handling
 * SOLID Principle: Single Responsibility - Document-related API calls isolated
 */

import { api } from './api';
import { ApiError, logError } from '@/shared/lib/errorHandler';
import { IS_DEVELOPMENT } from '@/shared/constants/config';

// =====================
// Document Types
// =====================

export interface DocumentMetadata {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface KeyFinding {
  text: string;
  confidence?: number;
}

export interface SummaryResult {
  overview: string;
  keyFindings?: KeyFinding[] | string[];
  keywords?: string[];
  metadata?: {
    readingTime?: number;
    confidence?: string;
    wordCount?: number;
  };
}

export interface Insight {
  id: string;
  insight_type: string;
  content: string;
  impact?: string | null;
  confidence_score?: number;
  created_at: string;
}

export interface ChatHighlight {
  question: string;
  answer: string;
  timestamp: string;
}

export interface DocumentValidationStatus {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface DocumentReference {
  documentId: string;
  documentName: string;
  excerpt: string;
  chunkIndex: number;
}

export type ContradictionType = 'version' | 'api' | 'config' | 'process' | 'architecture';
export type ContradictionSeverity = 'high' | 'medium' | 'low';

export interface ContradictionSource {
  docName: string;
  location: string;
  excerpt: string;
}

export interface Contradiction {
  id: string;
  severity: ContradictionSeverity;
  confidence: number;
  type: ContradictionType;
  description: string;
  sources: ContradictionSource[];
  // Legacy fields for backwards compatibility
  claim?: string;
  evidence?: string;
  explanation?: string;
  claimSource?: DocumentReference;
  evidenceSource?: DocumentReference;
  impact?: string;
}

export interface InformationGap {
  area: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  expectedInformation: string;
}

export interface Agreement {
  statement: string;
  sources: DocumentReference[];
  confidence: 'high' | 'medium' | 'low';
  significance: string;
}

export interface KeyClaim {
  claim: string;
  source: DocumentReference;
  importance: 'high' | 'medium' | 'low';
  type: 'fact' | 'opinion' | 'recommendation' | 'requirement';
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  relatedIssues: string[];
}

export interface RiskAssessment {
  overallRisk: 'high' | 'medium' | 'low';
  summary: string;
  criticalItems: string[];
  nextSteps: string[];
}

export interface ContradictionsResponse {
  contradictions: Contradiction[];
  groupedByType: Record<ContradictionType, Contradiction[]>;
}

export interface ValidationDataBase {
  contradictions: Contradiction[];
  gaps: InformationGap[];
  agreements: Agreement[];
  keyClaims: KeyClaim[];
  recommendations: Recommendation[];
  riskAssessment: RiskAssessment | null;
  analysisMetadata: {
    documentsAnalyzed: number;
    totalChunksReviewed: number;
    analysisTimestamp: string;
    cached: boolean;
  };
  // Enhanced contradiction grouping (non-breaking addition)
  contradictionsGroupedByType?: Record<ContradictionType, Contradiction[]>;
}

export interface ValidationData extends ValidationDataBase {
  // Optional nested validation types for within/across document analysis
  withinValidation?: ValidationDataBase;
  acrossValidation?: ValidationDataBase;
}

export interface DocumentReport {
  document: DocumentMetadata;
  summary: SummaryResult | null;
  insights: Insight[];
  chatHighlights: ChatHighlight[];
  validation: ValidationData | null;
  generatedAt: string;
}

export interface DocumentSummaryResponse {
  success: boolean;
  summary: SummaryResult;
}

// =====================
// Document API Calls
// =====================

/**
 * Fetches a comprehensive report for a document
 * GET /api/documents/{documentId}/report
 */
export async function getDocumentReport(documentId: string): Promise<DocumentReport> {
  try {
    if (!documentId || documentId.trim().length === 0) {
      throw new ApiError(400, 'Document ID is required');
    }

    const response = await api.get<DocumentReport>(
      `/api/documents/${encodeURIComponent(documentId)}/report`
    );

    // Validate response structure
    if (!response || typeof response !== 'object') {
      throw new ApiError(500, 'Invalid response format from server');
    }

    return response;
  } catch (error) {
    logError('getDocumentReport', error, IS_DEVELOPMENT);
    throw error;
  }
}

/**
 * Fetches summary for a document
 * GET /api/documents/{documentId}/summary
 */
export async function getDocumentSummary(documentId: string): Promise<SummaryResult> {
  try {
    if (!documentId || documentId.trim().length === 0) {
      throw new ApiError(400, 'Document ID is required');
    }

    const response = await api.get<DocumentSummaryResponse>(
      `/api/documents/${encodeURIComponent(documentId)}/summary`
    );

    // Validate response structure
    if (!response || !response.summary) {
      throw new ApiError(500, 'Invalid response format from server');
    }

    return response.summary;
  } catch (error) {
    logError('getDocumentSummary', error, IS_DEVELOPMENT);
    throw error;
  }
}

/**
 * Validates document integrity and metadata
 * GET /api/documents/{documentId}/validate
 */
export async function validateDocument(documentId: string): Promise<DocumentValidationStatus> {
  try {
    if (!documentId || documentId.trim().length === 0) {
      throw new ApiError(400, 'Document ID is required');
    }

    const response = await api.get<DocumentValidationStatus>(
      `/api/documents/${encodeURIComponent(documentId)}/validate`
    );

    if (!response || typeof response !== 'object') {
      throw new ApiError(500, 'Invalid response format from server');
    }

    return response;
  } catch (error) {
    logError('validateDocument', error, IS_DEVELOPMENT);
    throw error;
  }
}

/**
 * Regenerates document insights
 * POST /api/documents/{documentId}/regenerate-insights
 */
export async function regenerateDocumentInsights(documentId: string): Promise<Insight[]> {
  try {
    if (!documentId || documentId.trim().length === 0) {
      throw new ApiError(400, 'Document ID is required');
    }

    const response = await api.post<{ insights: Insight[] }>(
      `/api/documents/${encodeURIComponent(documentId)}/regenerate-insights`,
      {}
    );

    if (!response || !Array.isArray(response.insights)) {
      throw new ApiError(500, 'Invalid response format from server');
    }

    return response.insights;
  } catch (error) {
    logError('regenerateDocumentInsights', error, IS_DEVELOPMENT);
    throw error;
  }
}