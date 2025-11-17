import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDocumentSummary, type SummaryResult } from "../../../shared/lib/documentsApi";

export const Summary = () => {
  // Get document ID - try different possible param names
  const params = useParams<{ id?: string; documentId?: string; docId?: string }>();
  const documentId = params.id || params.documentId || params.docId;

  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setError("No document ID found in URL");
      setLoading(false);
      return;
    }

    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getDocumentSummary(documentId);
        setSummary(data);
      } catch (err) {
        console.error("❌ Failed to fetch summary:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load summary";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [documentId]);

  // Helper function to highlight keywords in text (handles multi-word phrases)
  const highlightKeywords = (text: string, keywords: string[]) => {
    if (!keywords || keywords.length === 0) return <>{text}</>;

    // Sort keywords by length (longest first) to match full phrases before partial matches
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);

    // Create a map of positions where keywords appear
    const highlights: { start: number; end: number; keyword: string }[] = [];
    const lowerText = text.toLowerCase();

    sortedKeywords.forEach((keyword) => {
      const lowerKeyword = keyword.toLowerCase();
      let index = 0;

      // Find all occurrences of this keyword
      while ((index = lowerText.indexOf(lowerKeyword, index)) !== -1) {
        // Check if this position overlaps with an existing highlight
        const overlaps = highlights.some(
          (h) =>
            (index >= h.start && index < h.end) ||
            (index + lowerKeyword.length > h.start && index < h.start)
        );

        if (!overlaps) {
          highlights.push({
            start: index,
            end: index + lowerKeyword.length,
            keyword,
          });
        }
        index += lowerKeyword.length;
      }
    });

    // Sort highlights by start position
    highlights.sort((a, b) => a.start - b.start);

    // Build the JSX with highlights
    const result: React.ReactNode[] = [];
    let lastIndex = 0;

    highlights.forEach((highlight, i) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        result.push(
          <span key={`text-${i}`}>{text.slice(lastIndex, highlight.start)}</span>
        );
      }

      // Add highlighted text
      result.push(
        <span key={`highlight-${i}`} className="text-chart-azure font-semibold">
          {text.slice(highlight.start, highlight.end)}
        </span>
      );

      lastIndex = highlight.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      result.push(<span key="text-end">{text.slice(lastIndex)}</span>);
    }

    return <>{result}</>;
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h2 className="text-3xl font-semibold mb-2">Summary</h2>
          <p className="text-muted-foreground">AI-generated document overview</p>
        </div>

        <div className="bg-card rounded-xl p-8 shadow-card">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
            <div className="h-4 bg-muted rounded w-4/6"></div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground text-center">
            Generating summary... (may take a few seconds)
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-card rounded-lg p-4 shadow-card animate-pulse"
            >
              <div className="h-4 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h2 className="text-3xl font-semibold mb-2">Summary</h2>
          <p className="text-muted-foreground">AI-generated document overview</p>
        </div>

        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8">
          <p className="text-destructive text-center font-semibold mb-2">Error</p>
          <p className="text-destructive text-center">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const { overview, keyFindings = [], keywords = [], metadata } = summary;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold mb-1">Summary</h2>
          <p className="text-muted-foreground">
            AI-generated document overview & key insights
          </p>
        </div>

        {metadata && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {metadata.readingTime && (
                  <span className="px-3 py-1 rounded-full bg-muted/60">
        ~{metadata.readingTime} min read
      </span>
              )}
            </div>
        )}

      </div>

      {/* Overview */}
      <div className="bg-card rounded-xl p-8 shadow-card">
        <h3 className="text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Overview
        </h3>
        <p className="text-lg leading-relaxed">
          {highlightKeywords(overview, keywords)}
        </p>
      </div>

      {/* Key findings */}
      {keyFindings.length > 0 && (
        <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
              Key insights
            </h3>
          </div>
          <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed text-foreground">
            {keyFindings.map((finding, i) => (
              <li key={i}>{finding}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
            Keywords
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {keywords.map((keyword, i) => (
              <div
                key={i}
                className="bg-card rounded-lg p-4 text-center shadow-card hover:shadow-hover transition-all hover:scale-[1.01]"
              >
                <span className="text-chart-magenta text-sm font-medium">
                  {keyword}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
