import { AlertTriangle } from "lucide-react";

const contradictions = [
  {
    claim: "Projected 15% YoY growth across all segments",
    evidence: "Historical data shows 3 of 5 segments declining for past 2 quarters",
    severity: "high",
  },
  {
    claim: "Operational efficiency improved by 22%",
    evidence: "Cost per unit increased 8% in same period, suggesting accounting methodology shift",
    severity: "medium",
  },
];

const gaps = [
  {
    area: "Risk Assessment",
    description: "No mention of competitive threats despite 3 new market entrants in Q2",
  },
  {
    area: "Financial Projections",
    description: "Revenue forecast lacks sensitivity analysis or alternative scenarios",
  },
];

export const Contradictions = () => {
  return (
    <div className="space-y-8 animate-slide-in">
      <div>
        <h2 className="text-3xl font-semibold mb-2 lowercase">contradictions & gaps</h2>
        <p className="text-muted-foreground">Inconsistencies and missing context</p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-medium mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-muted-foreground" />
            Contradictions
          </h3>
          <div className="space-y-3">
            {contradictions.map((item, i) => (
              <div
                key={i}
                className="grid md:grid-cols-2 gap-4 p-6 bg-card rounded-xl shadow-card hover:shadow-hover transition-all"
              >
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Claim
                  </span>
                  <p className="text-foreground">{item.claim}</p>
                </div>
                <div className="space-y-2 pl-4" style={{ boxShadow: 'inset 4px 0 0 rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      Evidence
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        item.severity === "high"
                          ? "bg-muted text-foreground"
                          : "bg-muted text-chart-mid"
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{item.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-medium mb-4">Information Gaps</h3>
          <div className="space-y-3">
            {gaps.map((gap, i) => (
              <div
                key={i}
                className="p-6 bg-card rounded-xl shadow-card hover:shadow-hover transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-chart-mid" />
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{gap.area}</h4>
                    <p className="text-muted-foreground text-sm">{gap.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
