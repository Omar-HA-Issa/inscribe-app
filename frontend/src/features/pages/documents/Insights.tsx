import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Target, Lightbulb, AlertTriangle, FileText, Filter, RefreshCw, Clock, Copy, Check, Search, ArrowUpDown } from 'lucide-react';
import { generateDocumentInsights, Insight } from '@/shared/lib/insightsApi';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner.tsx';

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
const categoryOrder = ['opportunity', 'risk', 'anomaly', 'pattern'];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [sortByConfidence, setSortByConfidence] = useState<Record<string, boolean>>({});

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

  const toggleSortByConfidence = (category: string) => {
    setSortByConfidence(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const copyInsight = async (insight: Insight, index: number) => {
    const text = `${insight.title}

${insight.description}

Impact: ${insight.impact}

Evidence:
${insight.evidence.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Category: ${insight.category}
Confidence: ${insight.confidence}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const filteredInsights = insights.filter(insight => {
    const categoryMatch = selectedCategories.size === 0 || selectedCategories.has(insight.category);
    const confidenceMatch = selectedConfidence.size === 0 || selectedConfidence.has(insight.confidence);

    // Search filter
    const searchMatch = !searchQuery ||
      insight.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insight.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insight.impact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insight.evidence.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()));

    return categoryMatch && confidenceMatch && searchMatch;
  });

  // Group insights by category
  const groupedInsights = filteredInsights.reduce((acc, insight) => {
    if (!acc[insight.category]) {
      acc[insight.category] = [];
    }
    acc[insight.category].push(insight);
    return acc;
  }, {} as Record<string, Insight[]>);

  // Sort each category
  const confidenceOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
  Object.keys(groupedInsights).forEach(category => {
    const sortDescending = sortByConfidence[category];
    groupedInsights[category].sort((a, b) => {
      const order = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
      return sortDescending ? -order : order;
    });
  });

  if (loading) {
    return (
      <LoadingSpinner
        message="Analyzing document..."
        subMessage="This may take a while"
      />
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
    <div className="max-w-5xl mx-auto p-8 space-y-6 animate-slide-in">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold mb-1">Hidden Insights</h2>
          <p className="text-muted-foreground text-sm">AI-discovered patterns and non-obvious connections</p>
        </div>

        <div className="flex items-center gap-3">
          {generatedAt && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {cached && <Clock className="w-3 h-3 inline mr-1" />}
                {cached ? 'Cached' : 'Generated'}
              </p>
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

      {/* Search & Filters Bar */}
      {insights.length > 0 && (
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between gap-4">
            {/* Category Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {categoryOrder.map((category) => {
                const Icon = categoryIcons[category as keyof typeof categoryIcons];
                const count = insights.filter(i => i.category === category).length;
                if (count === 0) return null;
                const isSelected = selectedCategories.has(category);
                const colorClass = categoryColors[category as keyof typeof categoryColors];
                const label = categoryLabels[category as keyof typeof categoryLabels];

                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? `${colorClass} bg-muted border border-current`
                        : 'text-muted-foreground bg-card border border-border hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                    <span className="text-xs opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Confidence Filters */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {['High', 'Medium', 'Low'].map(conf => {
                const count = insights.filter(i => i.confidence === conf).length;
                if (count === 0) return null;
                const isSelected = selectedConfidence.has(conf);

                return (
                  <button
                    key={conf}
                    onClick={() => toggleConfidence(conf)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-accent/20 text-accent border border-accent/30'
                        : 'text-muted-foreground bg-card border border-border hover:bg-muted/50'
                    }`}
                  >
                    {conf}: {count}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Insights - Grouped by Category */}
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
                {/* Category Header with Sort */}
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                    <h3 className="text-lg font-semibold">{label}</h3>
                    <span className="text-sm text-muted-foreground">({categoryInsights.length})</span>
                  </div>

                  <button
                    onClick={() => toggleSortByConfidence(category)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-all"
                    title="Sort by confidence"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>{sortByConfidence[category] ? 'Low → High' : 'High → Low'}</span>
                  </button>
                </div>

                {/* Category Insights */}
                <div className="space-y-3">
                  {categoryInsights.map((insight, i) => {
                    const globalIndex = insights.findIndex(ins => ins === insight);
                    const isExpanded = expandedInsight === globalIndex;
                    const isCopied = copiedIndex === globalIndex;

                    return (
                      <div
                        key={globalIndex}
                        className="bg-card rounded-xl p-5 shadow-card hover:shadow-hover transition-all"
                      >
                        <div className="flex-1 min-w-0 space-y-4">
                          {/* Title with Copy Button */}
                          <div className="flex items-start justify-between gap-4">
                            <h4 className="text-lg font-semibold flex-1">{insight.title}</h4>
                            <button
                              onClick={() => copyInsight(insight, globalIndex)}
                              className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded transition-all flex-shrink-0"
                              title="Copy insight"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
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

                              {/* AI Confidence */}
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
          <p className="text-sm mt-2">Try adjusting your search or filter selection</p>
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