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

interface Contradiction {
  claim: string;
  evidence: string;
  severity: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  claimSource: DocumentReference;
  evidenceSource: DocumentReference;
  impact: string;
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
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
      high: 'text-red-500',
      medium: 'text-yellow-500',
      low: 'text-green-500',
    };
    return colors[severity as keyof typeof colors] || colors.medium;
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
        <div className="text-gray-500">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Document Validation</h1>
        <p className="text-gray-400">Analyze documents for contradictions and inconsistencies</p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
          {error}
        </div>
      )}

      {!result ? (
        // Setup View
        <div className="space-y-8">
          {/* Current Document */}
          <div className="bg-white/5 rounded-lg p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-400">Analyzing</span>
            </div>
            <p className="text-lg font-medium text-white">{currentDocumentName || 'Current Document'}</p>
          </div>

          {/* Analysis Mode Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-white">Select Analysis Type</h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Within Document */}
              <button
                onClick={() => setAnalysisMode('within')}
                className={`text-left p-6 rounded-lg transition-all ${
                  analysisMode === 'within'
                    ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                }`}
              >
                <FileText className="w-6 h-6 mb-3" />
                <h3 className="font-semibold mb-2">Within Document</h3>
                <p className={`text-sm ${analysisMode === 'within' ? 'text-white/90' : 'text-gray-400'}`}>
                  Find internal contradictions and inconsistencies
                </p>
              </button>

              {/* Across Documents */}
              <button
                onClick={() => setAnalysisMode('across')}
                className={`text-left p-6 rounded-lg transition-all ${
                  analysisMode === 'across'
                    ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-6 h-6" />
                  <FileText className="w-6 h-6 -ml-3" />
                </div>
                <h3 className="font-semibold mb-2">Compare Documents</h3>
                <p className={`text-sm ${analysisMode === 'across' ? 'text-white/90' : 'text-gray-400'}`}>
                  Compare with other documents to find differences
                </p>
              </button>
            </div>
          </div>

          {/* Document Selection (for across mode) */}
          {analysisMode === 'across' && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-white">Select Documents to Compare</h2>
              <div className="bg-white/5 rounded-lg p-6 border border-white/10 space-y-3">
                {availableDocuments
                  .filter(doc => doc.id !== currentDocumentId)
                  .map(doc => (
                    <label
                      key={doc.id}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded hover:bg-white/10 cursor-pointer transition-colors group"
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
                        className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500 bg-white/10 border-white/20"
                      />
                      <span className="text-white flex-1">{doc.file_name}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteConfirmId(doc.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 p-1"
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
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </span>
              ) : (
                'Start Analysis'
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
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            New Analysis
          </button>

          {/* Check if we have valid results */}
          {!result.riskAssessment && !result.contradictions && !result.gaps && !result.agreements && !result.recommendations ? (
            <div className="bg-white/5 rounded-lg p-8 border border-white/10 text-center">
              <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Analysis Results</h3>
              <p className="text-gray-400">The analysis completed but returned no results. This might be due to insufficient document content or an API issue.</p>
            </div>
          ) : result.riskAssessment?.summary.includes('not meaningfully comparable') || result.riskAssessment?.summary.includes('Documents are not') ? (
            // Show special message for unrelated documents
            <div className="space-y-6">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-8 text-center">
                <Info className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-white mb-3">Documents Not Comparable</h3>
                <p className="text-gray-300 text-lg mb-4">{result.riskAssessment.summary}</p>
              </div>

              {result.riskAssessment.nextSteps && result.riskAssessment.nextSteps.length > 0 && (
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h4 className="text-lg font-semibold text-white mb-3">Suggestion</h4>
                  <p className="text-gray-300">{result.riskAssessment.nextSteps[0]}</p>
                </div>
              )}

              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-3">Documents Analyzed</h4>
                <p className="text-gray-400">
                  {result.analysisMetadata.documentsAnalyzed} documents • {result.analysisMetadata.totalChunksReviewed} sections reviewed
                </p>
              </div>
            </div>
          ) : (result.contradictions?.length === 0 && result.gaps?.length === 0 && result.agreements?.length === 0) ? (
            // Show positive message when no issues found
            <div className="space-y-6">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-white mb-3">No Issues Found</h3>
                <p className="text-gray-300 text-lg mb-4">
                  {analysisMode === 'within'
                    ? 'The document appears internally consistent with no contradictions or missing information detected.'
                    : 'The documents are consistent with each other. No contradictions or significant gaps were found.'}
                </p>
                <span className="inline-block px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                  ✓ Good Quality
                </span>
              </div>

              {result.riskAssessment && (
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <h4 className="text-lg font-semibold text-white mb-3">Analysis Summary</h4>
                  <p className="text-gray-300">{result.riskAssessment.summary}</p>
                </div>
              )}

              {result.recommendations && result.recommendations.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
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
                      <div key={i} className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg p-6 border border-purple-500/20">
                        <h3 className="text-lg font-semibold text-white mb-2">{rec.title}</h3>
                        <p className="text-gray-300">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-3">Analysis Details</h4>
                <p className="text-gray-400">
                  {currentDocumentName}
                  {result.analysisMetadata.documentsAnalyzed > 1 && ` + ${result.analysisMetadata.documentsAnalyzed - 1} other${result.analysisMetadata.documentsAnalyzed > 2 ? 's' : ''}`} • {result.analysisMetadata.totalChunksReviewed} sections reviewed
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Risk Overview */}
          {result.riskAssessment && (
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Shield className={`w-6 h-6 ${getSeverityColor(result.riskAssessment.overallRisk || 'medium')}`} />
                  <div>
                    <h2 className="text-xl font-semibold text-white">Overall Assessment</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {currentDocumentName}
                      {result.analysisMetadata.documentsAnalyzed > 1 && ` + ${result.analysisMetadata.documentsAnalyzed - 1} other${result.analysisMetadata.documentsAnalyzed > 2 ? 's' : ''}`} • {result.analysisMetadata.totalChunksReviewed} sections
                    </p>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getSeverityColor(result.riskAssessment.overallRisk || 'medium')} bg-white/10`}>
                  {getConsistencyLabel(result.riskAssessment.overallRisk || 'medium')}
                </span>
              </div>
              <p className="text-gray-300">{result.riskAssessment.summary}</p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-gray-400">Contradictions</span>
              </div>
              <p className="text-3xl font-light text-white">{result.contradictions?.length || 0}</p>
            </div>

            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-gray-400">Information Gaps</span>
              </div>
              <p className="text-3xl font-light text-white">{result.gaps?.length || 0}</p>
            </div>

            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-400">Agreements</span>
              </div>
              <p className="text-3xl font-light text-white">{result.agreements?.length || 0}</p>
            </div>
          </div>

          {/* Critical Items */}
          {result.riskAssessment && result.riskAssessment.criticalItems && result.riskAssessment.criticalItems.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" />
                Priority Focus Areas
              </h2>
              <div className="space-y-3">
                {result.riskAssessment.criticalItems.map((item, i) => (
                  <div key={i} className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded">
                    <p className="text-gray-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contradictions */}
          {result.contradictions && result.contradictions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Contradictions Found ({result.contradictions.length})
              </h2>
              <div className="space-y-4">
                {result.contradictions.map((contradiction, i) => (
                  <div key={i} className="bg-white/5 rounded-lg overflow-hidden border border-white/10">
                    <button
                      onClick={() => setExpandedContradictions(toggle(expandedContradictions, i))}
                      className="w-full p-6 text-left hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs text-gray-400">
                              AI Confidence: {contradiction.confidence || 'medium'}
                            </span>
                          </div>
                          <p className="text-white font-medium mb-1">{contradiction.claim}</p>
                          <p className="text-gray-400 text-sm">{contradiction.evidence}</p>
                        </div>
                        {expandedContradictions.has(i) ? (
                          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>

                    {expandedContradictions.has(i) && (
                      <div className="px-6 pb-6 space-y-4 border-t border-white/10">
                        <div className="pt-4">
                          <h4 className="text-sm font-semibold text-white mb-2">Explanation</h4>
                          <p className="text-sm text-gray-300">{contradiction.explanation}</p>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-white mb-2">Impact</h4>
                          <p className="text-sm text-gray-300">{contradiction.impact}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-white/5 rounded p-4">
                            <p className="text-xs text-gray-400 mb-2">Claim Source</p>
                            <p className="text-sm font-medium text-white">{contradiction.claimSource.documentName}</p>
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">{contradiction.claimSource.excerpt}</p>
                          </div>

                          <div className="bg-white/5 rounded p-4">
                            <p className="text-xs text-gray-400 mb-2">Evidence Source</p>
                            <p className="text-sm font-medium text-white">{contradiction.evidenceSource.documentName}</p>
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">{contradiction.evidenceSource.excerpt}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Information Gaps */}
          {result.gaps && result.gaps.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-yellow-500" />
                Information Gaps ({result.gaps.length})
              </h2>
              <div className="space-y-4">
                {result.gaps.map((gap, i) => (
                  <div key={i} className="bg-white/5 rounded-lg overflow-hidden border border-white/10">
                    <button
                      onClick={() => setExpandedGaps(toggle(expandedGaps, i))}
                      className="w-full p-6 text-left hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-white font-medium mb-1">{gap.area}</p>
                          <p className="text-gray-400 text-sm">{gap.description}</p>
                        </div>
                        {expandedGaps.has(i) ? (
                          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>

                    {expandedGaps.has(i) && (
                      <div className="px-6 pb-6 pt-4 border-t border-white/10">
                        <h4 className="text-sm font-semibold text-white mb-2">Expected Information</h4>
                        <p className="text-sm text-gray-300">{gap.expectedInformation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agreements */}
          {result.agreements && result.agreements.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Agreements ({result.agreements.length})
              </h2>
              <div className="space-y-4">
                {result.agreements.map((agreement, i) => (
                  <div key={i} className="bg-white/5 rounded-lg overflow-hidden border border-white/10">
                    <button
                      onClick={() => setExpandedAgreements(toggle(expandedAgreements, i))}
                      className="w-full p-6 text-left hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs text-gray-400">
                              AI Confidence: {agreement.confidence || 'medium'} • {agreement.sources?.length || 0} source{(agreement.sources?.length || 0) > 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="text-white font-medium">{agreement.statement}</p>
                        </div>
                        {expandedAgreements.has(i) ? (
                          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>

                    {expandedAgreements.has(i) && (
                      <div className="px-6 pb-6 space-y-4 border-t border-white/10">
                        <div className="pt-4">
                          <h4 className="text-sm font-semibold text-white mb-2">Significance</h4>
                          <p className="text-sm text-gray-300">{agreement.significance}</p>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-white mb-2">Sources</h4>
                          <div className="space-y-2">
                            {(agreement.sources || []).map((source, j) => (
                              <div key={j} className="bg-white/5 rounded p-3">
                                <p className="text-sm font-medium text-white">{source.documentName}</p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{source.excerpt}</p>
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

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-500" />
                Recommendations ({result.recommendations.length})
              </h2>
              <div className="space-y-4">
                {result.recommendations
                  .sort((a, b) => {
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
                  })
                  .map((rec, i) => (
                  <div key={i} className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg p-6 border border-purple-500/20">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">{rec.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(rec.priority || 'medium')} bg-white/10`}>
                        {(rec.priority || 'medium').toUpperCase()} PRIORITY
                      </span>
                    </div>
                    <p className="text-gray-300 mb-4">{rec.description}</p>

                    {rec.actionItems && rec.actionItems.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-white mb-2">Action Items</h4>
                        <ul className="space-y-2">
                          {rec.actionItems.map((item, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                              <span className="text-purple-400 mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rec.relatedIssues && rec.relatedIssues.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Related Issues</h4>
                        <div className="flex flex-wrap gap-2">
                          {rec.relatedIssues.map((issue, j) => (
                            <span key={j} className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300">
                              {issue}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {result.riskAssessment && result.riskAssessment.nextSteps && result.riskAssessment.nextSteps.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Next Steps</h2>
              <div className="space-y-3">
                {result.riskAssessment.nextSteps.map((step, i) => (
                  <div key={i} className="flex gap-4 bg-white/5 rounded-lg p-4 border border-white/10">
                    <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                      {i + 1}
                    </span>
                    <p className="text-gray-300 pt-1">{step}</p>
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
          <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-md w-full mx-4 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-2">Delete Document</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete "{availableDocuments.find(d => d.id === deleteConfirmId)?.file_name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void handleDeleteDocument(deleteConfirmId);
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
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