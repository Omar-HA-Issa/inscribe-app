import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Target, Lightbulb, AlertTriangle, Loader2, FileText, Filter, RefreshCw, Clock } from 'lucide-react';
import { generateDocumentInsights, Insight } from '@/shared/lib/insightsApi';

const categoryIcons = {
  pattern: Target,
  anomaly: AlertCircle,
  opportunity: Lightbulb,
  risk: AlertTriangle,
};

const categoryColors = {
  pattern: 'text-purple-400',
  anomaly: 'text-yellow-400',
  opportunity: 'text-green-400',
  risk: 'text-red-400',
};

const categoryLabels = {
  pattern: 'Patterns',
  anomaly: 'Anomalies',
  opportunity: 'Opportunities',
  risk: 'Risks',
};

// Define display order: urgent → actionable → investigative → analytical
const categoryOrder = ['risk', 'opportunity', 'anomaly', 'pattern'];

export const Insights = () => {
  const { id: documentId } = useParams<{ id: string }>();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedConfidence, setSelectedConfidence] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (documentId) {
      loadInsights(false);
    }
  }, [documentId]);

  const loadInsights = async (forceRegenerate: boolean) => {
    if (!documentId) return;

    if (forceRegenerate) {
      setRegenerating(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await generateDocumentInsights(documentId, forceRegenerate);
      setInsights(result.insights);
      setGeneratedAt(result.generatedAt);
      setCached(result.cached || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  const handleRegenerate = () => {
    loadInsights(true);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const toggleConfidence = (confidence: string) => {
    setSelectedConfidence(prev => {
      const newSet = new Set(prev);
      if (newSet.has(confidence)) {
        newSet.delete(confidence);
      } else {
        newSet.add(confidence);
      }
      return newSet;
    });
  };

  const filteredInsights = insights.filter(insight => {
    const categoryMatch = selectedCategories.size === 0 || selectedCategories.has(insight.category);
    const confidenceMatch = selectedConfidence.size === 0 || selectedConfidence.has(insight.confidence);
    return categoryMatch && confidenceMatch;
  });

  // Group insights by category and sort by confidence
  const groupedInsights = filteredInsights.reduce((acc, insight) => {
    if (!acc[insight.category]) {
      acc[insight.category] = [];
    }
    acc[insight.category].push(insight);
    return acc;
  }, {} as Record<string, Insight[]>);

  // Sort each category by confidence (High -> Medium -> Low)
  const confidenceOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
  Object.keys(groupedInsights).forEach(category => {
    groupedInsights[category].sort((a, b) =>
      confidenceOrder[a.confidence] - confidenceOrder[b.confidence]
    );
  });

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-foreground';
      case 'Medium': return 'bg-chart-mid';
      case 'Low': return 'bg-chart-low';
      default: return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 animate-spin text-accent" />
        <p className="mt-4 text-lg text-muted-foreground">Analyzing document...</p>
        <p className="mt-1 text-xs text-muted-foreground">This may take 10-15 seconds</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="font-semibold text-destructive mb-2">Failed to Generate Insights</h3>
          <p className="text-sm text-destructive/80 mb-3">{error}</p>
          <button
            onClick={() => loadInsights(false)}
            className="px-4 py-2 bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-lg text-sm font-medium transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-semibold mb-2 lowercase">hidden insights</h2>
          <p className="text-muted-foreground">AI-discovered patterns and non-obvious connections</p>
        </div>

        <div className="flex items-center gap-3">
          {generatedAt && (
            <div className="text-right">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {cached && <Clock className="w-3 h-3" />}
                <span>{cached ? 'Cached' : 'Generated'}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {new Date(generatedAt).toLocaleString()}
              </p>
            </div>
          )}

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">{regenerating ? 'Regenerating...' : 'Regenerate'}</span>
          </button>
        </div>
      </div>

      {/* Stats & Filters Bar */}
      {insights.length > 0 && (
        <div className="bg-card rounded-xl p-3 shadow-card">
          <div className="flex items-center justify-between gap-6">
            {/* Left: Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{filteredInsights.length} of {insights.length}</span>
              </div>
              {insights.filter(i => i.confidence === 'High').length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {insights.filter(i => i.confidence === 'High').length} high confidence
                  </span>
                </div>
              )}
            </div>

            {/* Center: Category Filters - in priority order */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              {categoryOrder.map((category) => {
                const Icon = categoryIcons[category as keyof typeof categoryIcons];
                const count = insights.filter(i => i.category === category).length;
                if (count === 0) return null;
                const isSelected = selectedCategories.has(category);
                const colorClass = categoryColors[category as keyof typeof categoryColors];

                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                      isSelected
                        ? `${colorClass} bg-muted`
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Right: Confidence Filters */}
            <div className="flex items-center gap-2">
              {['High', 'Medium', 'Low'].map(conf => {
                const count = insights.filter(i => i.confidence === conf).length;
                if (count === 0) return null;
                const isSelected = selectedConfidence.has(conf);

                return (
                  <button
                    key={conf}
                    onClick={() => toggleConfidence(conf)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                    title={`${conf} confidence`}
                  >
                    {conf}: {count}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Insights - Grouped by Category in priority order */}
      {filteredInsights.length > 0 ? (
        <div className="space-y-6">
          {categoryOrder.map((category) => {
            const categoryInsights = groupedInsights[category];
            if (!categoryInsights || categoryInsights.length === 0) return null;

            const Icon = categoryIcons[category as keyof typeof categoryIcons] || Lightbulb;
            const colorClass = categoryColors[category as keyof typeof categoryColors];
            const label = categoryLabels[category as keyof typeof categoryLabels] || category;

            return (
              <div key={category} className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Icon className={`w-5 h-5 ${colorClass}`} />
                  <h3 className="text-lg font-semibold">{label}</h3>
                  <span className="text-sm text-muted-foreground">({categoryInsights.length})</span>
                </div>

                {/* Category Insights */}
                <div className="space-y-3">
                  {categoryInsights.map((insight, i) => {
                    const globalIndex = insights.findIndex(ins => ins === insight);
                    const isExpanded = expandedInsight === globalIndex;

                    return (
                      <div
                        key={globalIndex}
                        className="bg-card rounded-xl p-5 shadow-card hover:shadow-hover transition-all"
                      >
                        <div className="flex-1 min-w-0 space-y-4">
                          {/* Title only */}
                          <div className="flex items-center justify-between gap-4">
                            <h4 className="text-lg font-semibold flex-1">{insight.title}</h4>
                          </div>

                          {/* Description */}
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {insight.description}
                          </p>

                          {/* Impact */}
                          <div className="bg-accent/5 rounded-lg p-3 border-l-2 border-accent/30">
                            <p className="text-xs font-semibold mb-1 text-accent uppercase tracking-wide">Impact</p>
                            <p className="text-sm text-foreground/90 leading-relaxed">{insight.impact}</p>
                          </div>

                          {/* Evidence & AI Confidence */}
                          <div>
                            <div className="flex items-center justify-between">
                              {insight.evidence && insight.evidence.length > 0 ? (
                                <button
                                  onClick={() => setExpandedInsight(isExpanded ? null : globalIndex)}
                                  className="text-xs text-accent hover:text-foreground transition-all font-medium"
                                >
                                  {isExpanded ? '▼ Hide Evidence' : `▶ View Evidence (${insight.evidence.length})`}
                                </button>
                              ) : (
                                <div />
                              )}

                              {/* AI Confidence - Fixed Position */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-xs text-muted-foreground">AI Confidence:</span>
                                <span className="text-xs font-medium text-foreground">
                                  {insight.confidence}
                                </span>
                              </div>
                            </div>

                            {/* Expanded Evidence */}
                            {isExpanded && insight.evidence && insight.evidence.length > 0 && (
                              <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                {insight.evidence.map((ev: string, idx: number) => (
                                  <p key={idx} className="text-xs text-muted-foreground italic leading-relaxed pl-3 border-l border-accent/20">
                                    "{ev}"
                                  </p>
                                ))}
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
      ) : insights.length > 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Filter className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No insights match your filters</p>
          <p className="text-sm mt-2">Try adjusting your filter selection</p>
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Lightbulb className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No insights generated yet</p>
          <p className="text-sm mt-2">AI analysis will appear here once complete</p>
        </div>
      )}
    </div>
  );
};