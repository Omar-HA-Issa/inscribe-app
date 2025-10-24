import { TrendingUp, AlertCircle, Target } from "lucide-react";

const insights = [
  {
    title: "Unexpected Revenue Correlation",
    description: "Marketing spend shows inverse correlation with Q3 revenue in regional markets, suggesting alternative growth drivers at play.",
    confidence: "High",
    icon: TrendingUp,
  },
  {
    title: "Hidden Cost Pattern",
    description: "Operational costs spike 23% every third month, likely tied to undocumented quarterly vendor contracts or seasonal staffing.",
    confidence: "Medium",
    icon: AlertCircle,
  },
  {
    title: "Market Opportunity Gap",
    description: "Document mentions 'emerging markets' 47 times but allocates only 12% of expansion budget, indicating strategic misalignment.",
    confidence: "High",
    icon: Target,
  },
];

export const Insights = () => {
  return (
    <div className="space-y-8 animate-slide-in">
      <div>
        <h2 className="text-3xl font-semibold mb-2 lowercase">hidden insights</h2>
        <p className="text-muted-foreground">AI-discovered patterns and anomalies</p>
      </div>

      <div className="space-y-4">
        {insights.map((insight, i) => {
          const Icon = insight.icon;
          return (
            <div
              key={i}
              className="bg-card rounded-xl p-6 shadow-card hover:shadow-hover hover:scale-[1.02] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">{insight.title}</h3>
                    <span
                      className={`text-xs px-3 py-1 rounded-full ${
                        insight.confidence === "High"
                          ? "bg-accent/20 text-accent"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {insight.confidence} Confidence
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {insight.description}
                  </p>
                  <button className="mt-4 text-sm text-accent hover:text-accent/80 transition-colors">
                    View Evidence →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
