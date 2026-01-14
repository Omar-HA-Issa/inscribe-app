import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle, FileText, CheckCircle2, Info, ChevronDown, ChevronUp,
  Shield, Lightbulb, Target, ArrowLeft
} from 'lucide-react';

// [Interfaces]
interface DocumentReference {
  documentId: string;
  documentName: string;
  excerpt: string;
  chunkIndex: number;
}

type ContradictionType = 'version' | 'api' | 'config' | 'process' | 'architecture';
type ContradictionSeverity = 'high' | 'medium' | 'low';

interface ContradictionSource {
  docName: string;
  location: string;
  excerpt: string;
}

interface Contradiction {
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

interface Agreement {
  statement: string;
  sources: DocumentReference[];
  confidence: 'high' | 'medium' | 'low';
  significance: string;
}

interface KeyClaim {
  claim: string;
  source: DocumentReference;
  importance: 'high' | 'medium' | 'low';
  type: 'fact' | 'opinion' | 'recommendation' | 'requirement';
}

interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  relatedIssues: string[];
}

interface RiskAssessment {
  overallRisk: 'high' | 'medium' | 'low';
  summary: string;
  criticalItems: string[];
  nextSteps: string[];
}

interface InformationGap {
  area: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  expectedInformation: string;
}

interface AnalysisResult {
  contradictions: Contradiction[];
  gaps: InformationGap[];
  agreements: Agreement[];
  keyClaims: KeyClaim[];
  recommendations: Recommendation[];
  riskAssessment: RiskAssessment;
  analysisMetadata: {
    documentsAnalyzed: number;
    totalChunksReviewed: number;
    analysisTimestamp: string;
    cached: boolean;
  };
  // Enhanced contradiction grouping (non-breaking addition)
  contradictionsGroupedByType?: Record<ContradictionType, Contradiction[]>;
}

interface Document {
  id: string;
  file_name: string;
}

export const Validator = () => {
  const { id: currentDocumentId } = useParams<{ id: string }>();
  const [currentDocumentName, setCurrentDocumentName] = useState<string>('');
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [analysisMode, setAnalysisMode] = useState<'within' | 'across' | null>(null);
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

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const token = localStorage.getItem('access_token');

        const response = await fetch(`${apiUrl}/api/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // eslint-disable-next-line @typescript-eslint/only-throw-error
        if (!response.ok) throw new Error('Failed to fetch documents');

        const data = await response.json();
        const docs = data.documents || [];

        setAvailableDocuments(docs);
        const currentDoc = docs.find((doc: Document) => doc.id === currentDocumentId);
        if (currentDoc) setCurrentDocumentName(currentDoc.file_name);
      } catch (err: unknown) {
        console.error('Error fetching documents:', err);
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

      // For 'across' mode, need at least one selected document
      if (analysisMode === 'across' && selectedDocs.length === 0) {
        setHasCachedAnalysis(false);
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const token = localStorage.getItem('access_token');

        const body: any = {
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
      } catch (err) {
        console.error('Error checking cache:', err);
        setHasCachedAnalysis(false);
      }
    };

    checkCachedAnalysis();
  }, [analysisMode, selectedDocs, currentDocumentId]);

  const handleAnalyze = async (): Promise<void> => {
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

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('access_token');

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
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      console.log('Analysis result:', data); // Debug log
      setResult(data);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error analyzing:', error);
      setError(error.message || 'Failed to analyze document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (set: Set<number>, index: number) => {
    const newSet = new Set(set);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    return newSet;
  };

  const handleDeleteDocument = async (docId: string): Promise<void> => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${apiUrl}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      // eslint-disable-next-line @typescript-eslint/only-throw-error
      if (!response.ok) throw new Error('Delete failed');

      // Remove from available documents
      setAvailableDocuments(availableDocuments.filter(d => d.id !== docId));
      // Remove from selected docs if it was selected
      setSelectedDocs(selectedDocs.filter(id => id !== docId));
      // Close confirmation dialog
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete document');
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      high: 'text-foreground font-semibold',
      medium: 'text-foreground',
      low: 'text-muted-foreground',
    };
    return colors[severity as keyof typeof colors] || colors.medium;
  };

  const getPriorityStyles = (priority: string) => {
    const styles = {
      high: 'bg-red-500/20 text-red-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      low: 'bg-green-500/20 text-green-400',
    };
    return styles[priority as keyof typeof styles] || styles.medium;
  };

  const getIssueSeverity = (issue: string) => {
    const lowerIssue = issue.toLowerCase();

    if (lowerIssue.includes('error') || lowerIssue.includes('critical') || lowerIssue.includes('fail') || lowerIssue.includes('high')) {
      return { severity: 'high', label: 'High Issue', styles: 'bg-red-500/20 text-red-400' };
    } else if (lowerIssue.includes('warning') || lowerIssue.includes('medium') || lowerIssue.includes('caution')) {
      return { severity: 'medium', label: 'Medium Issue', styles: 'bg-yellow-500/20 text-yellow-400' };
    } else {
      return { severity: 'low', label: 'Minor Issue', styles: 'bg-green-500/20 text-green-400' };
    }
  };

  const getConsistencyLabel = (level: string) => {
    const labels = {
      high: 'Major Issues',
      medium: 'Minor Issues',
      low: 'Good Quality',
    };
    return labels[level as keyof typeof labels] || labels.medium;
  };

  if (loadingDocs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Document Validation</h1>
        <p className="text-muted-foreground">Analyze documents for contradictions and inconsistencies</p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-muted/30 text-muted-foreground rounded-lg border border-border">
          {error}
        </div>
      )}

      {!result ? (
        // Setup View
        <div className="space-y-8">
          {/* Current Document */}
          <div className="bg-card rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Analyzing</span>
            </div>
            <p className="text-lg font-medium text-foreground">{currentDocumentName || 'Current Document'}</p>
          </div>

          {/* Analysis Mode Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">Select Analysis Type</h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Within Document */}
              <button
                onClick={() => setAnalysisMode('within')}
                className={`text-left p-6 rounded-lg transition-all ${
                  analysisMode === 'within'
                    ? 'bg-accent/10 border border-accent/30 text-foreground'
                    : 'bg-muted/20 hover:bg-muted/30 text-foreground border border-border'
                }`}
              >
                <FileText className="w-6 h-6 mb-3" />
                <h3 className="font-semibold mb-2">Within Document</h3>
                <p className={`text-sm ${analysisMode === 'within' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Find internal contradictions and inconsistencies
                </p>
              </button>

              {/* Across Documents */}
              <button
                onClick={() => setAnalysisMode('across')}
                className={`text-left p-6 rounded-lg transition-all ${
                  analysisMode === 'across'
                    ? 'bg-accent/10 border border-accent/30 text-foreground'
                    : 'bg-muted/20 hover:bg-muted/30 text-foreground border border-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-6 h-6" />
                  <FileText className="w-6 h-6 -ml-3" />
                </div>
                <h3 className="font-semibold mb-2">Compare Documents</h3>
                <p className={`text-sm ${analysisMode === 'across' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Compare with other documents to find differences
                </p>
              </button>
            </div>
          </div>

          {/* Document Selection (for across mode) */}
          {analysisMode === 'across' && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Select Documents to Compare</h2>
              <div className="bg-card rounded-xl p-6 space-y-3 shadow-card">
                {availableDocuments
                  .filter(doc => doc.id !== currentDocumentId)
                  .map(doc => (
                    <label
                      key={doc.id}
                      className="flex items-center gap-3 p-3 bg-muted/20 rounded hover:bg-muted/30 cursor-pointer transition-colors group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocs.includes(doc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocs([...selectedDocs, doc.id]);
                          } else {
                            setSelectedDocs(selectedDocs.filter(id => id !== doc.id));
                          }
                        }}
                        className="w-4 h-4 text-accent rounded focus:ring-accent bg-muted border-border"
                      />
                      <span className="text-foreground flex-1">{doc.file_name}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteConfirmId(doc.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </label>
                  ))}
              </div>
            </div>
          )}

          {/* Analyze Button */}
          {analysisMode && (analysisMode === 'within' || selectedDocs.length > 0) && (
            <button
              onClick={() => {
                void handleAnalyze();
              }}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {hasCachedAnalysis ? 'Loading...' : 'Analyzing...'}
                </span>
              ) : (
                hasCachedAnalysis ? 'Load Analysis' : 'Start Analysis'
              )}
            </button>
          )}
        </div>
      ) : (
        // Results View
        <div className="space-y-8">
          {/* Back Button */}
          <button
            onClick={() => {
              setResult(null);
              setAnalysisMode(null);
              setSelectedDocs([]);
              setError(null);
              setHasCachedAnalysis(false);
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            New Analysis
          </button>

          {/* Check if we have valid results */}
          {!result.riskAssessment && !result.contradictions && !result.gaps && !result.agreements && !result.recommendations ? (
            <div className="bg-card rounded-xl p-8 text-center shadow-card">
              <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Analysis Results</h3>
              <p className="text-muted-foreground">The analysis completed but returned no results. This might be due to insufficient document content or an API issue.</p>
            </div>
          ) : result.riskAssessment?.summary.includes('not meaningfully comparable') || result.riskAssessment?.summary.includes('Documents are not') ? (
            // Show special message for unrelated documents
            <div className="space-y-6">
              <div className="bg-card rounded-xl p-8 text-center shadow-card">
                <Info className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-foreground mb-3">Documents Not Comparable</h3>
                <p className="text-foreground text-lg mb-4">{result.riskAssessment.summary}</p>
              </div>

              {result.riskAssessment.nextSteps && result.riskAssessment.nextSteps.length > 0 && (
                <div className="bg-card rounded-xl p-6 shadow-card">
                  <h4 className="text-lg font-semibold text-foreground mb-3">Suggestion</h4>
                  <p className="text-foreground">{result.riskAssessment.nextSteps[0]}</p>
                </div>
              )}

            </div>
          ) : (result.contradictions?.length === 0 && result.gaps?.length === 0 && result.agreements?.length === 0) ? (
            // Show positive message when no issues found
            <div className="space-y-6">
              <div className="bg-card rounded-xl p-8 text-center shadow-card">
                <CheckCircle2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-foreground mb-3">No Issues Found</h3>
                <p className="text-foreground text-lg mb-4">
                  {analysisMode === 'within'
                    ? 'The document appears internally consistent with no contradictions or missing information detected.'
                    : 'The documents are consistent with each other. No contradictions or significant gaps were found.'}
                </p>
                <span className="inline-block px-4 py-2 bg-muted/20 text-muted-foreground rounded-full text-sm font-medium">
                  ✓ Good Quality
                </span>
              </div>

              {result.riskAssessment && (
                <div className="bg-card rounded-xl p-6 shadow-card">
                  <h4 className="text-lg font-semibold text-foreground mb-3">Analysis Summary</h4>
                  <p className="text-foreground">{result.riskAssessment.summary}</p>
                </div>
              )}

              {result.recommendations && result.recommendations.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-purple-500" />
                    Suggestions for Improvement
                  </h2>
                  <div className="space-y-4">
                    {result.recommendations
                      .sort((a, b) => {
                        const priorityOrder = { high: 0, medium: 1, low: 2 };
                        return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
                      })
                      .map((rec, i) => (
                      <div key={i} className="bg-card rounded-xl p-6 shadow-card">
                        <h3 className="text-lg font-semibold text-foreground mb-2">{rec.title}</h3>
                        <p className="text-foreground">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-card rounded-xl p-6 shadow-card">
                <h4 className="text-lg font-semibold text-foreground mb-3">Analysis Details</h4>
                <p className="text-muted-foreground">
                  {currentDocumentName}
                  {result.analysisMetadata.documentsAnalyzed > 1 && ` + ${result.analysisMetadata.documentsAnalyzed - 1} other${result.analysisMetadata.documentsAnalyzed > 2 ? 's' : ''}`} • {result.analysisMetadata.totalChunksReviewed} sections reviewed
                </p>
              </div>
            </div>
          ) : (
            <>
                  {/* Executive Summary */}
          {result.riskAssessment && (
            <div className="bg-card rounded-xl p-6 shadow-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Shield className={`w-6 h-6 ${
                    result.riskAssessment.overallRisk === 'high' ? 'text-red-500' :
                    result.riskAssessment.overallRisk === 'medium' ? 'text-yellow-500' :
                    'text-green-500'
                  }`} />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Analysis Summary</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentDocumentName}
                      {result.analysisMetadata.documentsAnalyzed > 1 && ` + ${result.analysisMetadata.documentsAnalyzed - 1} other${result.analysisMetadata.documentsAnalyzed > 2 ? 's' : ''}`} • {result.analysisMetadata.totalChunksReviewed} sections reviewed
                    </p>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${getPriorityStyles(result.riskAssessment.overallRisk || 'medium')}`}>
                  {getConsistencyLabel(result.riskAssessment.overallRisk || 'medium')}
                </span>
              </div>
              <p className="text-foreground mb-4">{result.riskAssessment.summary}</p>

              {/* Quick Stats */}
              <div className={`grid gap-3 text-sm border-t border-border pt-4 ${analysisMode === 'across' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div>
                  <span className="text-muted-foreground">Issues Found:</span>
                  <p className="text-lg font-semibold text-foreground">{(result.contradictions?.length || 0) + (result.gaps?.length || 0) + (result.riskAssessment?.criticalItems?.length || 0)}</p>
                </div>
                {analysisMode === 'across' && (
                  <div>
                    <span className="text-muted-foreground">Agreements:</span>
                    <p className="text-lg font-semibold text-foreground">{result.agreements?.length || 0}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Action Items:</span>
                  <p className="text-lg font-semibold text-foreground">{result.recommendations?.length || 0}</p>
                </div>
              </div>
            </div>
          )}


          {/* Detailed Findings Section Header */}
          {((result.contradictions?.length || 0) > 0 || (result.gaps?.length || 0) > 0 || (result.agreements?.length || 0) > 0) && (
            <div className="pt-4 border-t border-border">
              <h2 className="text-lg font-semibold text-foreground mb-6">Detailed Findings</h2>
            </div>
          )}

          {/* Contradictions */}
          {result.contradictions && result.contradictions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Contradictions ({result.contradictions.length})
              </h3>
              <div className="space-y-4">
                {result.contradictions.map((contradiction, i) => (
                  <div key={contradiction.id || i} className="bg-card rounded-xl overflow-hidden shadow-card">
                    <button
                      onClick={() => setExpandedContradictions(toggle(expandedContradictions, i))}
                      className="w-full p-6 text-left hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              contradiction.type === 'version' ? 'bg-blue-500/20 text-blue-400' :
                              contradiction.type === 'api' ? 'bg-purple-500/20 text-purple-400' :
                              contradiction.type === 'config' ? 'bg-green-500/20 text-green-400' :
                              contradiction.type === 'process' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-orange-500/20 text-orange-400'
                            }`}>
                              {contradiction.type?.toUpperCase() || 'PROCESS'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Confidence: {(contradiction.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-foreground font-medium mb-1">{contradiction.description || contradiction.claim}</p>
                          <p className="text-muted-foreground text-sm">{contradiction.evidence}</p>
                        </div>
                        {expandedContradictions.has(i) ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </button>

                    {expandedContradictions.has(i) && (
                      <div className="px-6 pb-6 space-y-4 border-t border-border">
                        <div className="pt-4">
                          <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                          <p className="text-sm text-foreground">{contradiction.description}</p>
                        </div>

                        {contradiction.explanation && (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2">Explanation</h4>
                            <p className="text-sm text-foreground">{contradiction.explanation}</p>
                          </div>
                        )}

                        {contradiction.impact && (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2">Impact</h4>
                            <p className="text-sm text-foreground">{contradiction.impact}</p>
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-3">Sources</h4>
                          <div className="space-y-3">
                            {contradiction.sources && contradiction.sources.length > 0 ? (
                              contradiction.sources.map((source, j) => (
                                <div key={j} className="bg-card rounded-lg p-4 border-l-4 border-blue-500">
                                  <p className="text-xs font-semibold text-blue-400 mb-1 uppercase">{source.docName}</p>
                                  {source.location && (
                                    <p className="text-xs text-muted-foreground mb-2">Location: {source.location}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground italic line-clamp-3">{source.excerpt}</p>
                                </div>
                              ))
                            ) : (
                              <>
                                {contradiction.claimSource && (
                                  <div className="bg-card rounded-lg p-4 border-l-4 border-blue-500">
                                    <p className="text-xs font-semibold text-blue-400 mb-2 uppercase">From: {contradiction.claimSource.documentName}</p>
                                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3 italic">{contradiction.claimSource.excerpt}</p>
                                  </div>
                                )}

                                {contradiction.evidenceSource && (
                                  <div className="bg-card rounded-lg p-4 border-l-4 border-amber-500">
                                    <p className="text-xs font-semibold text-amber-400 mb-2 uppercase">From: {contradiction.evidenceSource.documentName}</p>
                                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3 italic">{contradiction.evidenceSource.excerpt}</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Issues & Gaps - Unified Section */}
          {(result.gaps?.length || 0) + (result.riskAssessment?.criticalItems?.length || 0) > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" />
                Key Issues & Gaps ({(result.gaps?.length || 0) + (result.riskAssessment?.criticalItems?.length || 0)})
              </h3>
              <div className="space-y-4">
                {/* Combined and sorted issues */}
                {(() => {
                  const allIssues: Array<{
                    id: string;
                    title: string;
                    description: string;
                    severity: 'high' | 'medium' | 'low';
                    type: 'gap' | 'critical';
                    expectedInformation?: string;
                  }> = [];

                  // Add critical items as high severity
                  result.riskAssessment?.criticalItems?.forEach((item, i) => {
                    allIssues.push({
                      id: `critical-${i}`,
                      title: item,
                      description: 'This is a critical item that needs to be addressed to improve document quality and consistency.',
                      severity: 'high',
                      type: 'critical',
                    });
                  });

                  // Add gaps
                  result.gaps?.forEach((gap, i) => {
                    allIssues.push({
                      id: `gap-${i}`,
                      title: gap.area,
                      description: gap.description,
                      severity: gap.severity,
                      type: 'gap',
                      expectedInformation: gap.expectedInformation,
                    });
                  });

                  // Sort by severity: high -> medium -> low
                  allIssues.sort((a, b) => {
                    const severityOrder = { high: 0, medium: 1, low: 2 };
                    return severityOrder[a.severity] - severityOrder[b.severity];
                  });

                  return allIssues.map((issue) => (
                    <div key={issue.id} className="bg-card rounded-xl shadow-card overflow-hidden">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-semibold text-foreground">{issue.title}</h3>
                          <span
                            className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                            style={{
                              backgroundColor: issue.severity === 'high' ? 'rgba(239, 68, 68, 0.2)' :
                                              issue.severity === 'medium' ? 'rgba(234, 179, 8, 0.2)' :
                                              'rgba(34, 197, 94, 0.2)',
                              color: issue.severity === 'high' ? '#f87171' :
                                     issue.severity === 'medium' ? '#facc15' :
                                     '#86efac'
                            }}
                          >
                            {issue.severity === 'high' ? 'BIG ISSUE' : issue.severity === 'medium' ? 'MEDIUM ISSUE' : 'MINOR ISSUE'}
                          </span>
                        </div>
                        <p className="text-foreground">{issue.description}</p>
                      </div>
                      {(issue.type === 'gap' && issue.expectedInformation) || issue.type === 'critical' ? (
                        <>
                          <button
                            onClick={() => {
                              const newSet = new Set(expandedIssues);
                              if (newSet.has(issue.id)) {
                                newSet.delete(issue.id);
                              } else {
                                newSet.add(issue.id);
                              }
                              setExpandedIssues(newSet);
                            }}
                            className="w-full px-6 py-3 border-t border-border hover:bg-muted/10 transition-colors flex items-center justify-between"
                          >
                            <span className="text-sm font-semibold text-foreground">
                              {issue.type === 'gap' ? 'Expected Information' : 'What\'s Needed'}
                            </span>
                            {expandedIssues.has(issue.id) ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                          {expandedIssues.has(issue.id) && (
                            <div className="px-6 pb-6">
                              <p className="text-sm text-foreground">
                                {issue.type === 'gap' ? issue.expectedInformation : issue.description}
                              </p>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Agreements - Only show for cross-document analysis */}
          {analysisMode === 'across' && result.agreements && result.agreements.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Agreements ({result.agreements.length})
              </h3>
              <div className="space-y-4">
                {result.agreements.map((agreement, i) => (
                  <div key={i} className="bg-card rounded-xl overflow-hidden shadow-card">
                    <button
                      onClick={() => setExpandedAgreements(toggle(expandedAgreements, i))}
                      className="w-full p-6 text-left hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs text-muted-foreground">
                              AI Confidence: {agreement.confidence || 'medium'} • {agreement.sources?.length || 0} source{(agreement.sources?.length || 0) > 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="text-foreground font-medium">{agreement.statement}</p>
                        </div>
                        {expandedAgreements.has(i) ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </button>

                    {expandedAgreements.has(i) && (
                      <div className="px-6 pb-6 space-y-4 border-t border-border">
                        <div className="pt-4">
                          <h4 className="text-sm font-semibold text-foreground mb-2">Significance</h4>
                          <p className="text-sm text-foreground">{agreement.significance}</p>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-3">Supported By</h4>
                          <div className="space-y-2">
                            {(agreement.sources || []).map((source, j) => (
                              <div key={j} className="bg-card rounded-lg p-4 border-l-4 border-green-500">
                                <p className="text-xs font-semibold text-green-400 mb-2 uppercase">Document: {source.documentName}</p>
                                <p className="text-xs text-muted-foreground italic line-clamp-3">{source.excerpt}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Plan */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-500" />
                Action Plan ({result.recommendations.length})
              </h2>
              <div className="space-y-4">
                {result.recommendations
                  .sort((a, b) => {
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
                  })
                  .map((rec, i) => (
                  <div key={i} className="bg-card rounded-xl p-6 shadow-card">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-foreground">{rec.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityStyles(rec.priority || 'medium')}`}>
                        {(rec.priority || 'medium').toUpperCase()} PRIORITY
                      </span>
                    </div>
                    <p className="text-foreground mb-4">{rec.description}</p>

                    {rec.actionItems && rec.actionItems.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">Steps to Take</h4>
                        <ul className="space-y-2">
                          {rec.actionItems.map((item, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted/30 flex items-center justify-center text-xs font-medium">{j + 1}</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-2">Delete Document</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete "{availableDocuments.find(d => d.id === deleteConfirmId)?.file_name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-muted/20 hover:bg-muted/30 text-foreground rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void handleDeleteDocument(deleteConfirmId);
                }}
                className="px-4 py-2 bg-accent text-background rounded-lg transition-colors hover:bg-accent/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};