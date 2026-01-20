import { useState, useEffect, useCallback } from 'react';
import { API_CONFIG, STORAGE_KEYS } from '@/shared/constants/config';
import type { ValidationDataBase } from '@/shared/lib/documentsApi';

export interface Document {
  id: string;
  file_name: string;
}

export type AnalysisMode = 'within' | 'across' | null;
export type AnalysisResult = ValidationDataBase;

export interface UseValidationReturn {
  // State
  currentDocumentName: string;
  availableDocuments: Document[];
  analysisMode: AnalysisMode;
  selectedDocs: string[];
  loading: boolean;
  loadingDocs: boolean;
  result: AnalysisResult | null;
  error: string | null;
  deleteConfirmId: string | null;
  hasCachedAnalysis: boolean;
  expandedContradictions: Set<number>;
  expandedGaps: Set<number>;
  expandedAgreements: Set<number>;
  expandedIssues: Set<string>;

  // Actions
  setAnalysisMode: (mode: AnalysisMode) => void;
  setSelectedDocs: (docs: string[]) => void;
  setDeleteConfirmId: (id: string | null) => void;
  setExpandedContradictions: (set: Set<number>) => void;
  setExpandedAgreements: (set: Set<number>) => void;
  setExpandedIssues: (set: Set<string>) => void;
  handleAnalyze: () => Promise<void>;
  handleDeleteDocument: (docId: string) => Promise<void>;
  resetAnalysis: () => void;
  toggleExpanded: (set: Set<number>, index: number) => Set<number>;
}

export function useValidation(currentDocumentId: string | undefined): UseValidationReturn {
  const [currentDocumentName, setCurrentDocumentName] = useState<string>('');
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expandedContradictions, setExpandedContradictions] = useState<Set<number>>(new Set());
  const [expandedGaps, setExpandedGaps] = useState<Set<number>>(new Set());
  const [expandedAgreements, setExpandedAgreements] = useState<Set<number>>(new Set());
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [hasCachedAnalysis, setHasCachedAnalysis] = useState(false);

  // Fetch documents on mount
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const apiUrl = API_CONFIG.BASE_URL;
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

        const response = await fetch(`${apiUrl}/api/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch documents');

        const data = await response.json();
        const docs = data.documents || [];

        setAvailableDocuments(docs);
        const currentDoc = docs.find((doc: Document) => doc.id === currentDocumentId);
        if (currentDoc) setCurrentDocumentName(currentDoc.file_name);
      } catch {
        setError('Failed to load documents');
      } finally {
        setLoadingDocs(false);
      }
    };

    if (currentDocumentId) fetchDocuments();
  }, [currentDocumentId]);

  // Check for cached analysis when configuration changes
  useEffect(() => {
    const checkCachedAnalysis = async () => {
      if (!analysisMode || !currentDocumentId) {
        setHasCachedAnalysis(false);
        return;
      }

      if (analysisMode === 'across' && selectedDocs.length === 0) {
        setHasCachedAnalysis(false);
        return;
      }

      try {
        const apiUrl = API_CONFIG.BASE_URL;
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

        const body: {
          documentId: string;
          validationType: string;
          compareDocumentIds?: string[];
        } = {
          documentId: currentDocumentId,
          validationType: analysisMode,
        };

        if (analysisMode === 'across') {
          body.compareDocumentIds = selectedDocs;
        }

        const response = await fetch(`${apiUrl}/api/contradictions/check-cache`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          setHasCachedAnalysis(data.hasCached || false);
        } else {
          setHasCachedAnalysis(false);
        }
      } catch {
        setHasCachedAnalysis(false);
      }
    };

    checkCachedAnalysis();
  }, [analysisMode, selectedDocs, currentDocumentId]);

  const handleAnalyze = useCallback(async (): Promise<void> => {
    if (!currentDocumentId) {
      setError('No document selected');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const endpoint = analysisMode === 'within'
        ? '/api/contradictions/analyze/within'
        : '/api/contradictions/analyze/across';

      const body = analysisMode === 'within'
        ? { documentId: currentDocumentId }
        : { primaryDocumentId: currentDocumentId, compareDocumentIds: selectedDocs };

      const apiUrl = API_CONFIG.BASE_URL;
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to analyze document. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentDocumentId, analysisMode, selectedDocs]);

  const handleDeleteDocument = useCallback(async (docId: string): Promise<void> => {
    try {
      const apiUrl = API_CONFIG.BASE_URL;
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

      const response = await fetch(`${apiUrl}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Delete failed');

      setAvailableDocuments(prev => prev.filter(d => d.id !== docId));
      setSelectedDocs(prev => prev.filter(id => id !== docId));
      setDeleteConfirmId(null);
    } catch {
      setError('Failed to delete document');
    }
  }, []);

  const resetAnalysis = useCallback(() => {
    setResult(null);
    setAnalysisMode(null);
    setSelectedDocs([]);
    setError(null);
    setHasCachedAnalysis(false);
  }, []);

  const toggleExpanded = useCallback((set: Set<number>, index: number): Set<number> => {
    const newSet = new Set(set);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    return newSet;
  }, []);

  return {
    currentDocumentName,
    availableDocuments,
    analysisMode,
    selectedDocs,
    loading,
    loadingDocs,
    result,
    error,
    deleteConfirmId,
    hasCachedAnalysis,
    expandedContradictions,
    expandedGaps,
    expandedAgreements,
    expandedIssues,
    setAnalysisMode,
    setSelectedDocs,
    setDeleteConfirmId,
    setExpandedContradictions,
    setExpandedAgreements,
    setExpandedIssues,
    handleAnalyze,
    handleDeleteDocument,
    resetAnalysis,
    toggleExpanded,
  };
}
