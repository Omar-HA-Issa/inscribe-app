import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Report = () => {
  const handleDownload = () => {
    // Mock download functionality
    console.log("Downloading report...");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-semibold mb-2 lowercase">comprehensive report</h2>
        <p className="text-muted-foreground">Full AI analysis and recommendations</p>
      </div>

      <div className="bg-card rounded-xl p-8 shadow-card">
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Executive Summary</h3>
            <p className="text-muted-foreground leading-relaxed">
              This comprehensive analysis reveals significant insights about document consistency,
              strategic alignment, and operational patterns. Key findings indicate strong revenue
              growth potential tempered by execution gaps in emerging market strategy.
            </p>
          </div>

          <div className="border-t border-border pt-6">
            <h4 className="font-semibold mb-3">Key Recommendations</h4>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 mt-2 rounded-full bg-accent flex-shrink-0" />
                <span>Realign budget allocation to match stated strategic priorities for emerging markets</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 mt-2 rounded-full bg-accent flex-shrink-0" />
                <span>Investigate and document the quarterly cost spike pattern for better forecasting</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 mt-2 rounded-full bg-accent flex-shrink-0" />
                <span>Enhance risk assessment section with competitive landscape analysis</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 mt-2 rounded-full bg-accent flex-shrink-0" />
                <span>Develop sensitivity models for revenue projections to improve planning accuracy</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-border pt-6">
            <h4 className="font-semibold mb-3">Analysis Methodology</h4>
            <p className="text-sm text-muted-foreground">
              This report was generated using advanced natural language processing and machine learning
              algorithms to identify patterns, inconsistencies, and strategic insights across the entire
              document corpus. Confidence scores are based on supporting evidence frequency and contextual
              relevance.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={handleDownload}
          className="text-accent hover:text-foreground hover:shadow-glow font-medium px-6 py-3 rounded-xl bg-card shadow-card transition-all flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Full Report
        </button>
        <button className="text-muted-foreground hover:text-foreground hover:brightness-110 transition-all flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          Share Link
        </button>
      </div>
    </div>
  );
};
