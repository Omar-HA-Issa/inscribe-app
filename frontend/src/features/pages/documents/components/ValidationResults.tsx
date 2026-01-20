import {
  AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp,
  Shield, Lightbulb, Target, ArrowLeft
} from 'lucide-react';
import type { AnalysisResult, AnalysisMode } from '../hooks/useValidation';

interface ValidationResultsProps {
  result: AnalysisResult;
  analysisMode: AnalysisMode;
  currentDocumentName: string;
  expandedContradictions: Set<number>;
  expandedAgreements: Set<number>;
  expandedIssues: Set<string>;
  onExpandContradiction: (set: Set<number>) => void;
  onExpandAgreement: (set: Set<number>) => void;
  onExpandIssue: (set: Set<string>) => void;
  onReset: () => void;
  toggleExpanded: (set: Set<number>, index: number) => Set<number>;
}

export function ValidationResults({
  result,
  analysisMode,
  currentDocumentName,
  expandedContradictions,
  expandedAgreements,
  expandedIssues,
  onExpandContradiction,
  onExpandAgreement,
  onExpandIssue,
  onReset,
  toggleExpanded,
}: ValidationResultsProps) {
  const getPriorityStyles = (priority: string) => {
    const styles = {
      high: 'bg-red-500/20 text-red-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      low: 'bg-green-500/20 text-green-400',
    };
    return styles[priority as keyof typeof styles] || styles.medium;
  };

  const getConsistencyLabel = (level: string) => {
    const labels = {
      high: 'Major Issues',
      medium: 'Minor Issues',
      low: 'Good Quality',
    };
    return labels[level as keyof typeof labels] || labels.medium;
  };

  // No results state
  if (!result.riskAssessment && !result.contradictions && !result.gaps && !result.agreements && !result.recommendations) {
    return (
      <div className="space-y-8">
        <BackButton onClick={onReset} />
        <div className="bg-card rounded-xl p-8 text-center shadow-card">
          <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Analysis Results</h3>
          <p className="text-muted-foreground">The analysis completed but returned no results. This might be due to insufficient document content or an API issue.</p>
        </div>
      </div>
    );
  }

  // Documents not comparable
  if (result.riskAssessment?.summary.includes('not meaningfully comparable') || result.riskAssessment?.summary.includes('Documents are not')) {
    return (
      <div className="space-y-8">
        <BackButton onClick={onReset} />
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
      </div>
    );
  }

  // No issues found
  if (result.contradictions?.length === 0 && result.gaps?.length === 0 && result.agreements?.length === 0) {
    return (
      <div className="space-y-8">
        <BackButton onClick={onReset} />
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
              Good Quality
            </span>
          </div>

          {result.riskAssessment && (
            <div className="bg-card rounded-xl p-6 shadow-card">
              <h4 className="text-lg font-semibold text-foreground mb-3">Analysis Summary</h4>
              <p className="text-foreground">{result.riskAssessment.summary}</p>
            </div>
          )}

          {result.recommendations && result.recommendations.length > 0 && (
            <RecommendationsList recommendations={result.recommendations} getPriorityStyles={getPriorityStyles} />
          )}

          <AnalysisDetails
            currentDocumentName={currentDocumentName}
            metadata={result.analysisMetadata}
          />
        </div>
      </div>
    );
  }

  // Full results view
  return (
    <div className="space-y-8">
      <BackButton onClick={onReset} />

      {/* Executive Summary */}
      {result.riskAssessment && (
        <ExecutiveSummary
          result={result}
          analysisMode={analysisMode}
          currentDocumentName={currentDocumentName}
          getPriorityStyles={getPriorityStyles}
          getConsistencyLabel={getConsistencyLabel}
        />
      )}

      {/* Detailed Findings Section Header */}
      {((result.contradictions?.length || 0) > 0 || (result.gaps?.length || 0) > 0 || (result.agreements?.length || 0) > 0) && (
        <div className="pt-4 border-t border-border">
          <h2 className="text-lg font-semibold text-foreground mb-6">Detailed Findings</h2>
        </div>
      )}

      {/* Contradictions */}
      {result.contradictions && result.contradictions.length > 0 && (
        <ContradictionsSection
          contradictions={result.contradictions}
          expandedContradictions={expandedContradictions}
          onExpand={onExpandContradiction}
          toggleExpanded={toggleExpanded}
        />
      )}

      {/* Key Issues & Gaps */}
      {(result.gaps?.length || 0) + (result.riskAssessment?.criticalItems?.length || 0) > 0 && (
        <IssuesAndGapsSection
          gaps={result.gaps || []}
          criticalItems={result.riskAssessment?.criticalItems || []}
          expandedIssues={expandedIssues}
          onExpandIssue={onExpandIssue}
        />
      )}

      {/* Agreements */}
      {analysisMode === 'across' && result.agreements && result.agreements.length > 0 && (
        <AgreementsSection
          agreements={result.agreements}
          expandedAgreements={expandedAgreements}
          onExpand={onExpandAgreement}
          toggleExpanded={toggleExpanded}
        />
      )}

      {/* Action Plan */}
      {result.recommendations && result.recommendations.length > 0 && (
        <ActionPlanSection recommendations={result.recommendations} getPriorityStyles={getPriorityStyles} />
      )}
    </div>
  );
}

// Sub-components
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      New Analysis
    </button>
  );
}

function AnalysisDetails({ currentDocumentName, metadata }: { currentDocumentName: string; metadata: AnalysisResult['analysisMetadata'] }) {
  return (
    <div className="bg-card rounded-xl p-6 shadow-card">
      <h4 className="text-lg font-semibold text-foreground mb-3">Analysis Details</h4>
      <p className="text-muted-foreground">
        {currentDocumentName}
        {metadata.documentsAnalyzed > 1 && ` + ${metadata.documentsAnalyzed - 1} other${metadata.documentsAnalyzed > 2 ? 's' : ''}`} • {metadata.totalChunksReviewed} sections reviewed
      </p>
    </div>
  );
}

function ExecutiveSummary({
  result,
  analysisMode,
  currentDocumentName,
  getPriorityStyles,
  getConsistencyLabel,
}: {
  result: AnalysisResult;
  analysisMode: AnalysisMode;
  currentDocumentName: string;
  getPriorityStyles: (priority: string) => string;
  getConsistencyLabel: (level: string) => string;
}) {
  if (!result.riskAssessment) return null;

  return (
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
  );
}

function ContradictionsSection({
  contradictions,
  expandedContradictions,
  onExpand,
  toggleExpanded,
}: {
  contradictions: NonNullable<AnalysisResult['contradictions']>;
  expandedContradictions: Set<number>;
  onExpand: (set: Set<number>) => void;
  toggleExpanded: (set: Set<number>, index: number) => Set<number>;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        Contradictions ({contradictions.length})
      </h3>
      <div className="space-y-4">
        {contradictions.map((contradiction, i) => (
          <div key={contradiction.id || i} className="bg-card rounded-xl overflow-hidden shadow-card">
            <button
              onClick={() => onExpand(toggleExpanded(expandedContradictions, i))}
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
  );
}

function IssuesAndGapsSection({
  gaps,
  criticalItems,
  expandedIssues,
  onExpandIssue,
}: {
  gaps: NonNullable<AnalysisResult['gaps']>;
  criticalItems: string[];
  expandedIssues: Set<string>;
  onExpandIssue: (set: Set<string>) => void;
}) {
  const allIssues: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    type: 'gap' | 'critical';
    expectedInformation?: string;
  }> = [];

  criticalItems.forEach((item, i) => {
    allIssues.push({
      id: `critical-${i}`,
      title: item,
      description: 'This is a critical item that needs to be addressed to improve document quality and consistency.',
      severity: 'high',
      type: 'critical',
    });
  });

  gaps.forEach((gap, i) => {
    allIssues.push({
      id: `gap-${i}`,
      title: gap.area,
      description: gap.description,
      severity: gap.severity,
      type: 'gap',
      expectedInformation: gap.expectedInformation,
    });
  });

  allIssues.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Target className="w-5 h-5 text-red-500" />
        Key Issues & Gaps ({allIssues.length})
      </h3>
      <div className="space-y-4">
        {allIssues.map((issue) => (
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
                    onExpandIssue(newSet);
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
        ))}
      </div>
    </div>
  );
}

function AgreementsSection({
  agreements,
  expandedAgreements,
  onExpand,
  toggleExpanded,
}: {
  agreements: NonNullable<AnalysisResult['agreements']>;
  expandedAgreements: Set<number>;
  onExpand: (set: Set<number>) => void;
  toggleExpanded: (set: Set<number>, index: number) => Set<number>;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        Agreements ({agreements.length})
      </h3>
      <div className="space-y-4">
        {agreements.map((agreement, i) => (
          <div key={i} className="bg-card rounded-xl overflow-hidden shadow-card">
            <button
              onClick={() => onExpand(toggleExpanded(expandedAgreements, i))}
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
  );
}

function ActionPlanSection({
  recommendations,
  getPriorityStyles,
}: {
  recommendations: NonNullable<AnalysisResult['recommendations']>;
  getPriorityStyles: (priority: string) => string;
}) {
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-purple-500" />
        Action Plan ({recommendations.length})
      </h2>
      <div className="space-y-4">
        {sortedRecommendations.map((rec, i) => (
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
  );
}

function RecommendationsList({
  recommendations,
  getPriorityStyles,
}: {
  recommendations: NonNullable<AnalysisResult['recommendations']>;
  getPriorityStyles: (priority: string) => string;
}) {
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-purple-500" />
        Suggestions for Improvement
      </h2>
      <div className="space-y-4">
        {sortedRecommendations.map((rec, i) => (
          <div key={i} className="bg-card rounded-xl p-6 shadow-card">
            <h3 className="text-lg font-semibold text-foreground mb-2">{rec.title}</h3>
            <p className="text-foreground">{rec.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
