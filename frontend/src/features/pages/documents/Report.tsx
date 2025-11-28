import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileText, Calendar, HardDrive, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { getDocumentReport, DocumentReport } from '@/shared/lib/documentsApi';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner.tsx';
import { Document, Packer, Paragraph, HeadingLevel, TextRun, PageBreak, UnorderedList } from 'docx';

interface ReportSection {
  id: string;
  label: string;
  enabled: boolean;
  hasData: boolean;
}

interface InsightToggle {
  id: string;
  enabled: boolean;
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
    { id: 'insights', label: 'Insights', enabled: true, hasData: false },
    { id: 'validation', label: 'Validation Analysis', enabled: true, hasData: false },
  ]);
  const [insightToggles, setInsightToggles] = useState<InsightToggle[]>([]);

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
            default:
              return section;
          }
        }));

        // Initialize insight toggles - all enabled by default
        if (data.insights && data.insights.length > 0) {
          setInsightToggles(data.insights.map(insight => ({
            id: insight.id,
            enabled: true,
          })));
        }
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

  const toggleInsight = (insightId: string) => {
    setInsightToggles(prev => prev.map(t =>
      t.id === insightId ? { ...t, enabled: !t.enabled } : t
    ));
  };

  const getOrganizedInsights = () => {
    if (!report?.insights) return {};

    const categoryOrder = ['opportunity', 'risk', 'anomaly', 'pattern'];
    const organized: Record<string, typeof report.insights> = {};

    categoryOrder.forEach(category => {
      const insights = report.insights
        .filter(i => (i.insight_type || 'insight').toLowerCase() === category)
        .sort((a, b) => {
          const scoreA = a.confidence_score || 0;
          const scoreB = b.confidence_score || 0;
          return scoreB - scoreA; // High to low
        });

      if (insights.length > 0) {
        organized[category] = insights;
      }
    });

    return organized;
  };

  const handleDownload = async () => {
    if (!report) return;

    try {
      const docxDoc = generateDocxReport(report);
      const blob = await Packer.toBlob(docxDoc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.document.fileName.replace(/\.[^/.]+$/, '')}_report.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate DOCX:', error);
    }
  };

  const generateDocxReport = (report: DocumentReport): Document => {
    const enabledSections = sections.filter(s => s.enabled && s.hasData);
    const sections_content: Paragraph[] = [];

    // Title
    sections_content.push(
      new Paragraph({
        text: 'DOCUMENT ANALYSIS REPORT',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      })
    );

    // Document Info
    if (enabledSections.find(s => s.id === 'metadata')) {
      sections_content.push(
        new Paragraph({
          text: 'DOCUMENT INFORMATION',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        }),
        new Paragraph(`File Name: ${report.document.fileName}`),
        new Paragraph(`File Type: ${report.document.fileType}`),
        new Paragraph(`File Size: ${formatFileSize(report.document.fileSize)}`),
        new Paragraph(`Upload Date: ${new Date(report.document.createdAt).toLocaleString()}`),
        new Paragraph({ text: '', spacing: { after: 200 } })
      );
    }

    // Summary
    if (enabledSections.find(s => s.id === 'summary') && report.summary?.overview) {
      sections_content.push(
        new Paragraph({
          text: 'EXECUTIVE SUMMARY',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        }),
        new Paragraph(report.summary.overview),
        new Paragraph({ text: '', spacing: { after: 200 } })
      );
    }

    // Key Findings
    if (enabledSections.find(s => s.id === 'keyFindings') && report.summary?.keyFindings && report.summary.keyFindings.length > 0) {
      sections_content.push(
        new Paragraph({
          text: 'KEY FINDINGS',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        }),
        ...report.summary.keyFindings.map((finding, i) => new Paragraph(`${i + 1}. ${finding}`)),
        new Paragraph({ text: '', spacing: { after: 200 } })
      );
    }

    // Keywords
    if (enabledSections.find(s => s.id === 'keywords') && report.summary?.keywords && report.summary.keywords.length > 0) {
      sections_content.push(
        new Paragraph({
          text: 'KEYWORDS',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        }),
        new Paragraph(report.summary.keywords.join(', ')),
        new Paragraph({ text: '', spacing: { after: 200 } })
      );
    }

    // Insights
    if (enabledSections.find(s => s.id === 'insights') && report.insights.length > 0) {
      const organizedInsights = getOrganizedInsights();
      const insightItems: Paragraph[] = [
        new Paragraph({
          text: 'INSIGHTS',
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        }),
      ];

      Object.entries(organizedInsights).forEach(([category, insights]) => {
        const categoryLabel =
          category === 'opportunity' ? 'Opportunities' :
          category === 'anomaly' ? 'Anomalies' :
          category.charAt(0).toUpperCase() + category.slice(1) + 's';

        insightItems.push(
          new Paragraph({
            text: categoryLabel,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 100, after: 50 },
          })
        );

        insights.forEach((insight, i) => {
          const toggle = insightToggles.find(t => t.id === insight.id);
          if (toggle?.enabled ?? true) {
            insightItems.push(
              new Paragraph(`${i + 1}. ${insight.content}`),
              ...(insight.confidence_score ? [new Paragraph(`Confidence: ${Math.round(insight.confidence_score * 100)}%`)] : []),
              ...(insight.impact ? [
                new Paragraph({
                  text: `Impact: ${insight.impact}`,
                  spacing: { before: 50, after: 100 },
                }),
              ] : [new Paragraph({ text: '', spacing: { after: 50 } })])
            );
          }
        });
      });

      insightItems.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      sections_content.push(...insightItems);
    }

    // Validation Analysis
    if (enabledSections.find(s => s.id === 'validation') && report.validation) {
      if (report.validation.contradictions.length > 0 || report.validation.gaps.length > 0 || report.validation.recommendations.length > 0) {
        sections_content.push(
          new Paragraph({
            text: 'VALIDATION ANALYSIS',
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          })
        );

        // Risk Assessment
        if (report.validation.riskAssessment) {
          sections_content.push(
            new Paragraph({
              text: 'Risk Assessment',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 50 },
            }),
            new Paragraph(`Overall Risk Level: ${report.validation.riskAssessment.overallRisk.toUpperCase()}`),
            new Paragraph(`Summary: ${report.validation.riskAssessment.summary}`),
            new Paragraph({ text: '', spacing: { after: 100 } })
          );
        }

        // Contradictions
        if (report.validation.contradictions.length > 0) {
          sections_content.push(
            new Paragraph({
              text: 'Contradictions Found',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 50 },
            }),
            ...report.validation.contradictions.slice(0, 5).map((contradiction, i) => [
              new Paragraph(`${i + 1}. ${contradiction.claim}`),
              new Paragraph(`Severity: ${contradiction.severity.toUpperCase()} | Confidence: ${contradiction.confidence.toUpperCase()}`),
              new Paragraph(`Explanation: ${contradiction.explanation}`),
            ]).flat(),
            new Paragraph({ text: '', spacing: { after: 100 } })
          );
        }

        // Information Gaps
        if (report.validation.gaps.length > 0) {
          sections_content.push(
            new Paragraph({
              text: 'Information Gaps',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 50 },
            }),
            ...report.validation.gaps.slice(0, 5).map((gap, i) => [
              new Paragraph(`${i + 1}. ${gap.area}`),
              new Paragraph(`Description: ${gap.description}`),
              new Paragraph(`Severity: ${gap.severity.toUpperCase()}`),
            ]).flat(),
            new Paragraph({ text: '', spacing: { after: 100 } })
          );
        }

        // Recommendations
        if (report.validation.recommendations.length > 0) {
          sections_content.push(
            new Paragraph({
              text: 'Recommendations',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 50 },
            }),
            ...report.validation.recommendations.slice(0, 5).map((rec, i) => [
              new Paragraph(`${i + 1}. ${rec.title}`),
              new Paragraph(`Priority: ${rec.priority.toUpperCase()}`),
              new Paragraph(`Description: ${rec.description}`),
            ]).flat(),
            new Paragraph({ text: '', spacing: { after: 100 } })
          );
        }

        sections_content.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      }
    }

    // Footer
    sections_content.push(
      new Paragraph({
        text: `Report Generated: ${new Date(report.generatedAt).toLocaleString()}`,
        spacing: { before: 300, after: 100 },
      }),
      new Paragraph({
        text: 'Generated by Inscribe AI Document Intelligence Platform',
      })
    );

    return new Document({
      sections: [
        {
          children: sections_content,
        },
      ],
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <LoadingSpinner message="Generating report..." />
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

      {/* Insights */}
      {report.insights && report.insights.length > 0 && sections.find(s => s.id === 'insights' && s.enabled) && (
        <div className="bg-card rounded-xl p-8 shadow-card space-y-8">
          <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
            Insights
          </h3>

          {Object.entries(getOrganizedInsights()).map(([category, insights]) => {
            const categoryLabel =
              category === 'opportunity' ? 'Opportunities' :
              category === 'anomaly' ? 'Anomalies' :
              category.charAt(0).toUpperCase() + category.slice(1) + 's';

            return (
            <div key={category} className="space-y-4">
              <h4 className="text-sm font-semibold text-accent uppercase tracking-wide">
                {categoryLabel}
              </h4>

              <div className="space-y-4">
                {insights.map((insight) => {
                  const toggle = insightToggles.find(t => t.id === insight.id);
                  const isEnabled = toggle?.enabled ?? true;

                  return (
                    <div
                      key={insight.id}
                      className={`rounded-lg p-4 border-l-4 transition-all ${
                        isEnabled
                          ? 'bg-muted/30 border-accent/30'
                          : 'bg-muted/10 border-muted/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => toggleInsight(insight.id)}
                          className="flex-shrink-0 mt-1"
                          aria-label={`Toggle insight ${insight.id}`}
                        >
                          {isEnabled ? (
                            <CheckSquare className="w-5 h-5 text-accent" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>

                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{insight.content}</p>
                            {insight.confidence_score && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {Math.round(insight.confidence_score * 100)}% confidence
                              </span>
                            )}
                          </div>

                          {insight.impact && (
                            <div className="mt-2 pt-2 border-t border-border/30">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Impact:</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">{insight.impact}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Validation Analysis */}
      {report.validation && sections.find(s => s.id === 'validation' && s.enabled) && (
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
        <p className="mt-1">Powered by Inscribe AI Document Intelligence</p>
      </div>
    </div>
  );
};