import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileText, Calendar, HardDrive, Loader2, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { getDocumentReport, DocumentReport } from '@/shared/lib/documentsApi';

interface ReportSection {
  id: string;
  label: string;
  enabled: boolean;
  hasData: boolean;
}

export const Report = () => {
  const { id: documentId } = useParams<{ id: string }>();
  const [report, setReport] = useState<DocumentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<ReportSection[]>([
    { id: 'metadata', label: 'Document Information', enabled: true, hasData: true },
    { id: 'summary', label: 'Executive Summary', enabled: true, hasData: false },
    { id: 'keyFindings', label: 'Key Findings', enabled: true, hasData: false },
    { id: 'keywords', label: 'Keywords', enabled: true, hasData: false },
    { id: 'insights', label: 'Key Insights', enabled: true, hasData: false },
    { id: 'validation', label: 'Validation Analysis', enabled: true, hasData: false },
    { id: 'chat', label: 'Q&A Highlights', enabled: true, hasData: false },
  ]);

  useEffect(() => {
    const fetchReport = async () => {
      if (!documentId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getDocumentReport(documentId);
        setReport(data);

        // Update sections based on available data
        setSections(prev => prev.map(section => {
          switch (section.id) {
            case 'metadata':
              return { ...section, hasData: true };
            case 'summary':
              return { ...section, hasData: !!data.summary?.overview };
            case 'keyFindings':
              return { ...section, hasData: !!(data.summary?.keyFindings && data.summary.keyFindings.length > 0) };
            case 'keywords':
              return { ...section, hasData: !!(data.summary?.keywords && data.summary.keywords.length > 0) };
            case 'insights':
              return { ...section, hasData: data.insights.length > 0 };
            case 'validation':
              return { ...section, hasData: !!(data.validation && (data.validation.contradictions.length > 0 || data.validation.gaps.length > 0 || data.validation.recommendations.length > 0)) };
            case 'chat':
              return { ...section, hasData: data.chatHighlights.length > 0 };
            default:
              return section;
          }
        }));
      } catch (err) {
        console.error('Failed to fetch report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [documentId]);

  const toggleSection = (sectionId: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const handleDownload = () => {
    if (!report) return;

    const content = generateTextReport(report);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.document.fileName.replace(/\.[^/.]+$/, '')}_report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateTextReport = (report: DocumentReport): string => {
    const lines: string[] = [];
    const enabledSections = sections.filter(s => s.enabled && s.hasData);

    lines.push('DOCUMENT ANALYSIS REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    // Document Info
    if (enabledSections.find(s => s.id === 'metadata')) {
      lines.push('DOCUMENT INFORMATION');
      lines.push('-'.repeat(80));
      lines.push(`File Name: ${report.document.fileName}`);
      lines.push(`File Type: ${report.document.fileType}`);
      lines.push(`File Size: ${formatFileSize(report.document.fileSize)}`);
      lines.push(`Upload Date: ${new Date(report.document.createdAt).toLocaleString()}`);
      lines.push('');
    }

    // Summary
    if (enabledSections.find(s => s.id === 'summary') && report.summary?.overview) {
      lines.push('EXECUTIVE SUMMARY');
      lines.push('-'.repeat(80));
      lines.push(report.summary.overview);
      lines.push('');
    }

    // Key Findings
    if (enabledSections.find(s => s.id === 'keyFindings') && report.summary?.keyFindings && report.summary.keyFindings.length > 0) {
      lines.push('KEY FINDINGS');
      lines.push('-'.repeat(80));
      report.summary.keyFindings.forEach((finding, i) => {
        lines.push(`  ${i + 1}. ${finding}`);
      });
      lines.push('');
    }

    // Keywords
    if (enabledSections.find(s => s.id === 'keywords') && report.summary?.keywords && report.summary.keywords.length > 0) {
      lines.push('KEYWORDS');
      lines.push('-'.repeat(80));
      lines.push(report.summary.keywords.join(', '));
      lines.push('');
    }

    // Insights
    if (enabledSections.find(s => s.id === 'insights') && report.insights.length > 0) {
      lines.push('KEY INSIGHTS');
      lines.push('-'.repeat(80));
      report.insights.slice(0, 5).forEach((insight, i) => {
        lines.push(`${i + 1}. [${insight.insight_type}] ${insight.content}`);
        if (insight.confidence_score) {
          lines.push(`   Confidence: ${Math.round(insight.confidence_score * 100)}%`);
        }
        lines.push('');
      });
    }

    // Validation Analysis
    if (enabledSections.find(s => s.id === 'validation') && report.validation) {
      if (report.validation.contradictions.length > 0 || report.validation.gaps.length > 0 || report.validation.recommendations.length > 0) {
        lines.push('VALIDATION ANALYSIS');
        lines.push('-'.repeat(80));
        lines.push('');

        if (report.validation.riskAssessment) {
          lines.push('RISK ASSESSMENT');
          lines.push(`Overall Risk Level: ${report.validation.riskAssessment.overallRisk.toUpperCase()}`);
          lines.push(`Summary: ${report.validation.riskAssessment.summary}`);
          lines.push('');
        }

        if (report.validation.contradictions.length > 0) {
          lines.push('CONTRADICTIONS FOUND');
          report.validation.contradictions.slice(0, 5).forEach((contradiction, i) => {
            lines.push(`  ${i + 1}. ${contradiction.claim}`);
            lines.push(`     Severity: ${contradiction.severity.toUpperCase()} | Confidence: ${contradiction.confidence.toUpperCase()}`);
            lines.push(`     Explanation: ${contradiction.explanation}`);
            lines.push('');
          });
        }

        if (report.validation.gaps.length > 0) {
          lines.push('INFORMATION GAPS');
          report.validation.gaps.slice(0, 5).forEach((gap, i) => {
            lines.push(`  ${i + 1}. ${gap.area}`);
            lines.push(`     Description: ${gap.description}`);
            lines.push(`     Severity: ${gap.severity.toUpperCase()}`);
            lines.push('');
          });
        }

        if (report.validation.recommendations.length > 0) {
          lines.push('RECOMMENDATIONS');
          report.validation.recommendations.slice(0, 5).forEach((rec, i) => {
            lines.push(`  ${i + 1}. ${rec.title}`);
            lines.push(`     Priority: ${rec.priority.toUpperCase()}`);
            lines.push(`     Description: ${rec.description}`);
            lines.push('');
          });
        }
      }
    }

    // Chat Highlights
    if (enabledSections.find(s => s.id === 'chat') && report.chatHighlights.length > 0) {
      lines.push('CHAT Q&A HIGHLIGHTS');
      lines.push('-'.repeat(80));
      report.chatHighlights.forEach((qa, i) => {
        lines.push(`Q${i + 1}: ${qa.question}`);
        lines.push(`A${i + 1}: ${qa.answer.substring(0, 200)}${qa.answer.length > 200 ? '...' : ''}`);
        lines.push('');
      });
    }

    lines.push('='.repeat(80));
    lines.push(`Report Generated: ${new Date(report.generatedAt).toLocaleString()}`);
    lines.push(`Generated by DocuMind AI Document Intelligence Platform`);

    return lines.join('\n');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 animate-spin text-accent mb-4" />
        <p className="text-lg text-muted-foreground">Generating report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h2 className="text-3xl font-semibold mb-2">Report</h2>
          <p className="text-muted-foreground">Comprehensive document analysis</p>
        </div>

        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
          <div>
            <p className="text-destructive font-semibold mb-2">Failed to generate report</p>
            <p className="text-destructive/80">{error || 'Unknown error occurred'}</p>
          </div>
        </div>
      </div>
    );
  }

  const availableSections = sections.filter(s => s.hasData);
  const enabledSections = sections.filter(s => s.enabled && s.hasData);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-semibold mb-2">Comprehensive Report</h2>
          <p className="text-muted-foreground">Complete document analysis and insights</p>
        </div>

        <button
          onClick={handleDownload}
          disabled={enabledSections.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-lg transition-all hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Download Report</span>
        </button>
      </div>

      {/* Section Selector */}
      <div className="bg-card rounded-xl p-6 shadow-card">
        <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Customize Report
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select which sections to include in your report
        </p>

        {availableSections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableSections.map(section => (
              <button
                key={section.id}
                onClick={() => toggleSection(section.id)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                  section.enabled
                    ? 'bg-accent/10 border border-accent/30'
                    : 'bg-muted/30 border border-border hover:bg-muted/50'
                }`}
              >
                {section.enabled ? (
                  <CheckSquare className="w-5 h-5 text-accent flex-shrink-0" />
                ) : (
                  <Square className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
                <span className={`text-sm font-medium ${
                  section.enabled ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {section.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Only the Executive Summary is currently available for this document.
            </p>
            <p className="text-xs text-muted-foreground/80">
              To include additional sections (Key Insights, Validation Analysis, Q&A Highlights),
              generate them from the Insights and Validation pages first.
            </p>
          </div>
        )}
      </div>

      {/* Document Overview */}
      {sections.find(s => s.id === 'metadata' && s.enabled && s.hasData) && (
        <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
          <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
            Document Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-accent flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">File Name</p>
                <p className="text-sm font-medium">{report.document.fileName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-accent flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Upload Date</p>
                <p className="text-sm font-medium">
                  {new Date(report.document.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-accent flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">File Size</p>
                <p className="text-sm font-medium">{formatFileSize(report.document.fileSize)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-accent flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-medium">{report.document.fileType}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Executive Summary */}
      {sections.find(s => s.id === 'summary' && s.enabled && s.hasData) && report.summary?.overview && (
        <div className="bg-card rounded-xl p-8 shadow-card space-y-6">
          <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
            Executive Summary
          </h3>

          <p className="text-lg leading-relaxed">{report.summary.overview}</p>
        </div>
      )}

      {/* Key Findings */}
      {sections.find(s => s.id === 'keyFindings' && s.enabled && s.hasData) && report.summary?.keyFindings && report.summary.keyFindings.length > 0 && (
        <div className="bg-card rounded-xl p-8 shadow-card space-y-6">
          <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
            Key Findings
          </h3>
          <ul className="space-y-3 text-muted-foreground">
            {report.summary.keyFindings.map((finding, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 mt-2 rounded-full bg-accent flex-shrink-0" />
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Keywords */}
      {sections.find(s => s.id === 'keywords' && s.enabled && s.hasData) && report.summary?.keywords && report.summary.keywords.length > 0 && (
        <div className="bg-card rounded-xl p-8 shadow-card space-y-6">
          <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
            Keywords
          </h3>
          <div className="flex flex-wrap gap-2">
            {report.summary.keywords.map((keyword, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key Insights */}
      {sections.find(s => s.id === 'insights' && s.enabled && s.hasData) && report.insights.length > 0 && (
        <div className="bg-card rounded-xl p-8 shadow-card space-y-6">
          <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
            Key Insights
          </h3>

          <div className="space-y-4">
            {report.insights.slice(0, 5).map((insight, i) => (
              <div
                key={insight.id}
                className="bg-muted/30 rounded-lg p-4 border-l-2 border-accent/30"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <span className="text-xs font-semibold text-accent uppercase tracking-wide">
                    {insight.insight_type}
                  </span>
                  {insight.confidence_score && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(insight.confidence_score * 100)}% confidence
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">{insight.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Analysis */}
      {sections.find(s => s.id === 'validation' && s.enabled && s.hasData) && report.validation && (
        <div className="bg-card rounded-xl p-8 shadow-card space-y-6">
          <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
            Validation Analysis
          </h3>

          {/* Risk Assessment */}
          {report.validation.riskAssessment && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border-l-4 ${
                report.validation.riskAssessment.overallRisk === 'high' ? 'bg-red-500/10 border-red-500' :
                report.validation.riskAssessment.overallRisk === 'medium' ? 'bg-yellow-500/10 border-yellow-500' :
                'bg-green-500/10 border-green-500'
              }`}>
                <p className="text-sm font-semibold mb-2">Risk Level: {report.validation.riskAssessment.overallRisk.toUpperCase()}</p>
                <p className="text-sm text-muted-foreground">{report.validation.riskAssessment.summary}</p>
              </div>
            </div>
          )}

          {/* Contradictions */}
          {report.validation.contradictions.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Contradictions Found</p>
              {report.validation.contradictions.slice(0, 5).map((contradiction, i) => (
                <div key={i} className="bg-muted/30 rounded-lg p-4 border-l-2 border-red-500/50">
                  <p className="text-sm font-medium text-foreground mb-1">{contradiction.claim}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Severity: <span className="text-foreground font-semibold">{contradiction.severity}</span> •
                    Confidence: <span className="text-foreground font-semibold">{contradiction.confidence}</span>
                  </p>
                  <p className="text-sm text-foreground/80">{contradiction.explanation}</p>
                </div>
              ))}
            </div>
          )}

          {/* Information Gaps */}
          {report.validation.gaps.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Information Gaps</p>
              {report.validation.gaps.slice(0, 5).map((gap, i) => (
                <div key={i} className="bg-muted/30 rounded-lg p-4 border-l-2 border-yellow-500/50">
                  <p className="text-sm font-medium text-foreground mb-1">{gap.area}</p>
                  <p className="text-xs text-muted-foreground mb-2">Severity: <span className="text-foreground font-semibold">{gap.severity}</span></p>
                  <p className="text-sm text-foreground/80">{gap.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {report.validation.recommendations.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Recommendations</p>
              {report.validation.recommendations.slice(0, 5).map((rec, i) => (
                <div key={i} className="bg-muted/30 rounded-lg p-4 border-l-2 border-green-500/50">
                  <p className="text-sm font-medium text-foreground mb-1">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mb-2">Priority: <span className="text-foreground font-semibold">{rec.priority}</span></p>
                  <p className="text-sm text-foreground/80 mb-2">{rec.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat Highlights */}
      {sections.find(s => s.id === 'chat' && s.enabled && s.hasData) && report.chatHighlights.length > 0 && (
        <div className="bg-card rounded-xl p-8 shadow-card space-y-6">
          <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
            Q&A Highlights
          </h3>

          <div className="space-y-6">
            {report.chatHighlights.map((qa, i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-accent/20 text-accent rounded-full flex items-center justify-center font-semibold text-sm">
                    Q
                  </span>
                  <p className="text-sm text-foreground pt-1">{qa.question}</p>
                </div>

                <div className="flex items-start gap-3 pl-2">
                  <span className="flex-shrink-0 w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                    A
                  </span>
                  <p className="text-sm text-muted-foreground pt-1 leading-relaxed">
                    {qa.answer.length > 300 ? qa.answer.substring(0, 300) + '...' : qa.answer}
                  </p>
                </div>

                {i < report.chatHighlights.length - 1 && (
                  <div className="border-t border-border mt-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {enabledSections.length === 0 && (
        <div className="bg-card rounded-xl p-12 shadow-card text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground mb-2">No sections enabled</p>
          <p className="text-sm text-muted-foreground">
            Select at least one section above to view the report
          </p>
        </div>
      )}

      {/* Report Metadata */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Report generated on {new Date(report.generatedAt).toLocaleString()}</p>
        <p className="mt-1">Powered by DocuMind AI Document Intelligence</p>
      </div>
    </div>
  );
};