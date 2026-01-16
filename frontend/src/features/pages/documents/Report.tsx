import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileText, Calendar, HardDrive, AlertCircle, CheckSquare, Square, Edit2, Check, X } from 'lucide-react';
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

interface ValidationItemToggle {
  id: string;
  type: 'contradiction' | 'gap' | 'recommendation';
  enabled: boolean;
}

export const Report = () => {
  const { id: documentId } = useParams<{ id: string }>();
  const [report, setReport] = useState<DocumentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState(false);
  const [reportFileName, setReportFileName] = useState('');
  const [sections, setSections] = useState<ReportSection[]>([
    { id: 'metadata', label: 'Document Information', enabled: true, hasData: true },
    { id: 'summary', label: 'Executive Summary', enabled: true, hasData: false },
    { id: 'keyFindings', label: 'Key Findings', enabled: true, hasData: false },
    { id: 'keywords', label: 'Keywords', enabled: true, hasData: false },
    { id: 'insights', label: 'Insights', enabled: true, hasData: false },
    { id: 'validation', label: 'Validation Analysis', enabled: true, hasData: false },
  ]);
  const [insightToggles, setInsightToggles] = useState<InsightToggle[]>([]);
  const [validationToggles, setValidationToggles] = useState<ValidationItemToggle[]>([]);
  const [selectedValidationTypes, setSelectedValidationTypes] = useState<Set<'within' | 'across'>>(new Set(['within']));

  useEffect(() => {
    const fetchReport = async () => {
      if (!documentId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getDocumentReport(documentId);
        setReport(data);
        setReportFileName(data.document.fileName);

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
              return { ...section, hasData: !!(data.validation && (data.validation.contradictions.length > 0 || data.validation.gaps.length > 0 || data.validation.recommendations.length > 0 || !!data.validation.riskAssessment)) };
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

        // Initialize validation toggles - all enabled by default
        const validationItems: ValidationItemToggle[] = [];
        if (data.validation) {
          data.validation.contradictions.forEach((c, i) => {
            validationItems.push({
              id: `contradiction-${i}`,
              type: 'contradiction',
              enabled: true,
            });
          });
          data.validation.gaps.forEach((g, i) => {
            validationItems.push({
              id: `gap-${i}`,
              type: 'gap',
              enabled: true,
            });
          });
          data.validation.recommendations.forEach((r, i) => {
            validationItems.push({
              id: `recommendation-${i}`,
              type: 'recommendation',
              enabled: true,
            });
          });
        }
        setValidationToggles(validationItems);

        // Fetch saved preferences
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
          const token = localStorage.getItem('access_token');
          const prefsResponse = await fetch(`${apiUrl}/api/documents/${documentId}/preferences`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (prefsResponse.ok) {
            const prefs = await prefsResponse.json();
            if (prefs.hiddenInsights && prefs.hiddenInsights.length > 0) {
              setInsightToggles(prev => prev.map(t => ({
                ...t,
                enabled: !prefs.hiddenInsights.includes(t.id),
              })));
            }
            if (prefs.hiddenValidationItems && prefs.hiddenValidationItems.length > 0) {
              setValidationToggles(prev => prev.map(t => ({
                ...t,
                enabled: !prefs.hiddenValidationItems.includes(t.id),
              })));
            }
          }
        } catch (err) {
          console.warn('Failed to fetch preferences:', err);
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
    savePreferences();
  };

  const toggleValidationItem = (itemId: string) => {
    setValidationToggles(prev => prev.map(t =>
      t.id === itemId ? { ...t, enabled: !t.enabled } : t
    ));
    savePreferences();
  };

  const savePreferences = async () => {
    if (!documentId) return;

    try {
      const hiddenInsights = insightToggles
        .filter(t => !t.enabled)
        .map(t => t.id);

      const hiddenValidationItems = validationToggles
        .filter(t => !t.enabled)
        .map(t => t.id);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('access_token');

      await fetch(`${apiUrl}/api/documents/${documentId}/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabledSections: sections.filter(s => s.enabled).map(s => s.id),
          hiddenInsights,
          hiddenValidationItems,
        }),
      });
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  };

  const handleSaveFileName = () => {
    if (report && reportFileName.trim()) {
      setReport({
        ...report,
        document: {
          ...report.document,
          fileName: reportFileName,
        },
      });
      setEditingFileName(false);
    }
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

  const toggleValidationType = (type: 'within' | 'across') => {
    setSelectedValidationTypes(new Set([type]));
  };

  const getCombinedValidationData = () => {
    if (!report?.validation) return null;

    const combinedData = {
      contradictions: [] as any[],
      gaps: [] as any[],
      agreements: [] as any[],
      keyClaims: [] as any[],
      recommendations: [] as any[],
      riskAssessment: null as any,
      analysisMetadata: {
        documentsAnalyzed: 0,
        totalChunksReviewed: 0,
        analysisTimestamp: new Date().toISOString(),
        cached: false,
      },
    };

    if (selectedValidationTypes.has('within') && (report.validation as any).withinValidation) {
      const withinData = (report.validation as any).withinValidation;
      combinedData.contradictions.push(...(withinData.contradictions || []));
      combinedData.gaps.push(...(withinData.gaps || []));
      combinedData.agreements.push(...(withinData.agreements || []));
      combinedData.keyClaims.push(...(withinData.keyClaims || []));
      combinedData.recommendations.push(...(withinData.recommendations || []));
      if (withinData.riskAssessment && !combinedData.riskAssessment) {
        combinedData.riskAssessment = withinData.riskAssessment;
      }
      combinedData.analysisMetadata.documentsAnalyzed += withinData.analysisMetadata?.documentsAnalyzed || 0;
      combinedData.analysisMetadata.totalChunksReviewed += withinData.analysisMetadata?.totalChunksReviewed || 0;
    }

    if (selectedValidationTypes.has('across') && (report.validation as any).acrossValidation) {
      const acrossData = (report.validation as any).acrossValidation;
      combinedData.contradictions.push(...(acrossData.contradictions || []));
      combinedData.gaps.push(...(acrossData.gaps || []));
      combinedData.agreements.push(...(acrossData.agreements || []));
      combinedData.keyClaims.push(...(acrossData.keyClaims || []));
      combinedData.recommendations.push(...(acrossData.recommendations || []));
      if (acrossData.riskAssessment && !combinedData.riskAssessment) {
        combinedData.riskAssessment = acrossData.riskAssessment;
      }
      combinedData.analysisMetadata.documentsAnalyzed += acrossData.analysisMetadata?.documentsAnalyzed || 0;
      combinedData.analysisMetadata.totalChunksReviewed += acrossData.analysisMetadata?.totalChunksReviewed || 0;
    }

    return combinedData;
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
        text: reportFileName,
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
      // Determine which validation to use (prioritize within if both selected)
      let activeValidation = null;
      let validationTypeLabel = '';

      if (selectedValidationTypes.has('within') && (report.validation as any).withinValidation) {
        activeValidation = (report.validation as any).withinValidation;
        validationTypeLabel = 'Within Document Validation Analysis';
      } else if (selectedValidationTypes.has('across') && (report.validation as any).acrossValidation) {
        activeValidation = (report.validation as any).acrossValidation;
        validationTypeLabel = 'Cross Document Validation Analysis';
      } else {
        activeValidation = report.validation;
      }

      if (activeValidation && (activeValidation.contradictions.length > 0 || activeValidation.gaps.length > 0 || activeValidation.recommendations.length > 0)) {
        sections_content.push(
          new Paragraph({
            text: 'VALIDATION ANALYSIS',
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          })
        );

        if (validationTypeLabel) {
          sections_content.push(
            new Paragraph({
              text: validationTypeLabel,
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 50 },
            })
          );
        }

        // Risk Assessment
        if (activeValidation.riskAssessment) {
          const riskParagraphs = [
            new Paragraph({
              text: 'Risk Assessment',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 50 },
            }),
            new Paragraph(`Overall Risk Level: ${activeValidation.riskAssessment.overallRisk.toUpperCase()}`),
            new Paragraph(`Summary: ${activeValidation.riskAssessment.summary}`),
          ];


          riskParagraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }));
          sections_content.push(...riskParagraphs);
        }

        // Contradictions
        const enabledContradictions = activeValidation.contradictions.filter((c, i) => {
          const toggle = validationToggles.find(t => t.id === `contradiction-${i}`);
          return toggle?.enabled ?? true;
        });
        if (enabledContradictions.length > 0) {
          sections_content.push(
            new Paragraph({
              text: 'Contradictions Found',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 50 },
            }),
            ...enabledContradictions.slice(0, 5).map((contradiction, i) => [
              new Paragraph(`${i + 1}. ${contradiction.claim}`),
              new Paragraph(`Severity: ${contradiction.severity.toUpperCase()} | Confidence: ${contradiction.confidence.toUpperCase()}`),
              new Paragraph(`Explanation: ${contradiction.explanation}`),
            ]).flat(),
            new Paragraph({ text: '', spacing: { after: 100 } })
          );
        }

        // Information Gaps
        const enabledGaps = activeValidation.gaps.filter((g, i) => {
          const toggle = validationToggles.find(t => t.id === `gap-${i}`);
          return toggle?.enabled ?? true;
        });
        if (enabledGaps.length > 0) {
          sections_content.push(
            new Paragraph({
              text: 'Information Gaps',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 50 },
            }),
            ...enabledGaps.slice(0, 5).map((gap, i) => [
              new Paragraph(`${i + 1}. ${gap.area}`),
              new Paragraph(`Description: ${gap.description}`),
              new Paragraph(`Severity: ${gap.severity.toUpperCase()}`),
            ]).flat(),
            new Paragraph({ text: '', spacing: { after: 100 } })
          );
        }

        // Recommendations
        const enabledRecommendations = activeValidation.recommendations.filter((r, i) => {
          const toggle = validationToggles.find(t => t.id === `recommendation-${i}`);
          return toggle?.enabled ?? true;
        });
        if (enabledRecommendations.length > 0) {
          sections_content.push(
            new Paragraph({
              text: 'Recommendations',
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 50 },
            }),
            ...enabledRecommendations.slice(0, 5).map((rec, i) => [
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

  const getFileTypeLabel = (fileType: string): string => {
    // Extract just the file extension from MIME type (e.g., "application/pdf" -> "PDF")
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('word') || fileType.includes('document')) return 'DOCX';
    if (fileType.includes('text') || fileType.includes('plain')) return 'TXT';
    if (fileType.includes('sheet') || fileType.includes('excel')) return 'XLSX';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'PPTX';
    // Fallback to uppercase of the input
    return fileType.toUpperCase();
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
    <div className="max-w-5xl mx-auto p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-semibold mb-2">Report</h2>
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

        {/* Validation Type Selector */}
        {report?.validation && ((report.validation as any).withinValidation || (report.validation as any).acrossValidation) && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3">
              Validation Analysis Type
            </p>
            <div className="flex gap-3">
              {(report.validation as any).withinValidation && (
                <button
                  onClick={() => toggleValidationType('within')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                    selectedValidationTypes.has('within')
                      ? 'bg-accent/10 border border-accent/30 text-foreground'
                      : 'bg-muted/30 border border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {selectedValidationTypes.has('within') ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  Within Document
                </button>
              )}
              {(report.validation as any).acrossValidation && (
                <button
                  onClick={() => toggleValidationType('across')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                    selectedValidationTypes.has('across')
                      ? 'bg-accent/10 border border-accent/30 text-foreground'
                      : 'bg-muted/30 border border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {selectedValidationTypes.has('across') ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  Cross Document
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Report Title Customization */}
      <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Title of Report</p>

        {editingFileName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={reportFileName}
              onChange={(e) => setReportFileName(e.target.value)}
              className="text-2xl font-semibold bg-muted/30 border border-border rounded px-3 py-2 text-foreground flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveFileName();
                if (e.key === 'Escape') setEditingFileName(false);
              }}
              autoFocus
            />
            <button onClick={handleSaveFileName} className="p-2 hover:bg-muted/50 rounded transition">
              <Check className="w-5 h-5 text-chart-cyan" />
            </button>
            <button onClick={() => setEditingFileName(false)} className="p-2 hover:bg-muted/50 rounded transition">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="group">
            <h2 className="text-2xl font-semibold flex items-center gap-3">
              {reportFileName}
              <button
                onClick={() => setEditingFileName(true)}
                className="opacity-0 group-hover:opacity-100 hover:bg-muted/50 p-2 rounded transition"
              >
                <Edit2 className="w-5 h-5 text-muted-foreground" />
              </button>
            </h2>
          </div>
        )}
      </div>

      {/* Document Analysis Overview */}
      {sections.find(s => s.id === 'metadata' && s.enabled && s.hasData) && (
        <div className="bg-card rounded-xl p-6 shadow-card space-y-4 border-l-4 border-chart-azure">
          <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
            Document Overview
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-accent flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Document Name</p>
                <p className="text-sm font-medium">{report.document.fileName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-accent flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">File Type</p>
                <p className="text-sm font-medium">{getFileTypeLabel(report.document.fileType)}</p>
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
              <Calendar className="w-5 h-5 text-accent flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Upload Date</p>
                <p className="text-sm font-medium">{new Date(report.document.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Executive Summary */}
      {sections.find(s => s.id === 'summary' && s.enabled && s.hasData) && report.summary?.overview && (
        <div className="bg-card rounded-xl p-8 shadow-card space-y-6 border-l-4 border-chart-magenta">
          <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
            Executive Summary
          </h3>

          <p className="text-lg leading-relaxed">{report.summary.overview}</p>
        </div>
      )}

      {/* Key Findings */}
      {sections.find(s => s.id === 'keyFindings' && s.enabled && s.hasData) && report.summary?.keyFindings && report.summary.keyFindings.length > 0 && (
        <div className="bg-card rounded-xl p-8 shadow-card space-y-6 border-l-4 border-chart-cyan">
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
        <div className="bg-card rounded-xl p-8 shadow-card space-y-6 border-l-4 border-chart-cyan">
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
        <div className="bg-card rounded-xl p-8 shadow-card space-y-8 border-l-4 border-chart-magenta">
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
        <div className="bg-card rounded-xl p-8 shadow-card space-y-6 border-l-4 border-chart-azure">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
              Validation Analysis
            </h3>
            {((report.validation as any).withinValidation || (report.validation as any).acrossValidation) && (
              <div className="flex gap-2">
                {selectedValidationTypes.has('within') && (
                  <span className="text-xs bg-accent/10 border border-accent/30 rounded px-2 py-1 text-muted-foreground">
                    Within Document
                  </span>
                )}
                {selectedValidationTypes.has('across') && (
                  <span className="text-xs bg-accent/10 border border-accent/30 rounded px-2 py-1 text-muted-foreground">
                    Cross Document
                  </span>
                )}
              </div>
            )}
          </div>

          {(() => {
            const activeValidation = getCombinedValidationData();
            return activeValidation ? (
              <>
                {/* Risk Assessment */}
                {activeValidation.riskAssessment && (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg border-l-4 ${
                      activeValidation.riskAssessment.overallRisk === 'high' ? 'bg-red-500/10 border-red-500' :
                      activeValidation.riskAssessment.overallRisk === 'medium' ? 'bg-yellow-500/10 border-yellow-500' :
                      'bg-green-500/10 border-green-500'
                    }`}>
                      <p className="text-sm font-semibold mb-2">Risk Level: {activeValidation.riskAssessment.overallRisk.toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">{activeValidation.riskAssessment.summary}</p>
                    </div>

                  </div>
                )}

                {/* Contradictions */}
                {activeValidation.contradictions.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Contradictions Found</p>
                    {activeValidation.contradictions.slice(0, 5).map((contradiction, i) => {
                const toggle = validationToggles.find(t => t.id === `contradiction-${i}`);
                const isEnabled = toggle?.enabled ?? true;

                return (
                  <div
                    key={i}
                    className={`rounded-lg p-4 transition-all ${
                      isEnabled
                        ? 'bg-muted/30'
                        : 'bg-muted/10 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleValidationItem(`contradiction-${i}`)}
                        className="flex-shrink-0 mt-1"
                        aria-label={`Toggle contradiction ${i}`}
                      >
                        {isEnabled ? (
                          <CheckSquare className="w-5 h-5 text-accent" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>

                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground mb-1">{contradiction.claim}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Severity: <span className="text-foreground font-semibold">{contradiction.severity}</span> •
                          Confidence: <span className="text-foreground font-semibold">{contradiction.confidence}</span>
                        </p>
                        <p className="text-sm text-foreground/80">{contradiction.explanation}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

                {/* Information Gaps */}
                {activeValidation.gaps.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Information Gaps</p>
                    {activeValidation.gaps.slice(0, 5).map((gap, i) => {
                      const toggle = validationToggles.find(t => t.id === `gap-${i}`);
                      const isEnabled = toggle?.enabled ?? true;

                      return (
                        <div
                          key={i}
                          className={`rounded-lg p-4 transition-all ${
                            isEnabled
                              ? 'bg-muted/30'
                              : 'bg-muted/10 opacity-60'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <button
                              onClick={() => toggleValidationItem(`gap-${i}`)}
                              className="flex-shrink-0 mt-1"
                              aria-label={`Toggle gap ${i}`}
                            >
                              {isEnabled ? (
                                <CheckSquare className="w-5 h-5 text-accent" />
                              ) : (
                                <Square className="w-5 h-5 text-muted-foreground" />
                              )}
                            </button>

                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground mb-1">{gap.area}</p>
                              <p className="text-xs text-muted-foreground mb-2">Severity: <span className="text-foreground font-semibold">{gap.severity}</span></p>
                              <p className="text-sm text-foreground/80">{gap.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recommendations */}
                {activeValidation.recommendations.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Recommendations</p>
                    {activeValidation.recommendations.slice(0, 5).map((rec, i) => {
                      const toggle = validationToggles.find(t => t.id === `recommendation-${i}`);
                      const isEnabled = toggle?.enabled ?? true;

                      return (
                        <div
                          key={i}
                          className={`rounded-lg p-4 transition-all ${
                            isEnabled
                              ? 'bg-muted/30'
                              : 'bg-muted/10 opacity-60'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <button
                              onClick={() => toggleValidationItem(`recommendation-${i}`)}
                              className="flex-shrink-0 mt-1"
                              aria-label={`Toggle recommendation ${i}`}
                            >
                              {isEnabled ? (
                                <CheckSquare className="w-5 h-5 text-accent" />
                              ) : (
                                <Square className="w-5 h-5 text-muted-foreground" />
                              )}
                            </button>

                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground mb-1">{rec.title}</p>
                              <p className="text-xs text-muted-foreground mb-2">Priority: <span className="text-foreground font-semibold">{rec.priority}</span></p>
                              <p className="text-sm text-foreground/80 mb-2">{rec.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : null;
          })()}
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
      </div>
    </div>
  );
};