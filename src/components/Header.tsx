import { Sparkles, Clock } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  fileName?: string;
  onChangeDocument: () => void;
}

const tabs = [
  { id: "summary", label: "Summary" },
  { id: "insights", label: "Insights" },
  { id: "contradictions", label: "Contradictions" },
  { id: "visuals", label: "Visuals" },
  { id: "report", label: "Report" },
];

export const Header = ({ activeTab, onTabChange, fileName, onChangeDocument }: HeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-glass bg-background/80 border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent animate-shimmer" />
            <span className="text-lg font-semibold tracking-tight">DocuMind</span>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-all relative ${
                  activeTab === tab.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-active" />
                )}
              </button>
            ))}
          </nav>

          {/* File Info */}
          <div className="flex items-center gap-4 text-sm">
            {fileName && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">File:</span>
                  <span className="text-foreground font-medium">{fileName}</span>
                </div>
                <button
                  onClick={onChangeDocument}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change Document
                </button>
              </>
            )}
            <button className="p-2 hover:bg-card rounded-lg transition-colors">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
