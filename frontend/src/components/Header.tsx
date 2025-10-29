import { Clock } from "lucide-react";

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
  { id: "chat", label: "Chat" },  // Added Chat tab
];

export const Header = ({ activeTab, onTabChange, fileName, onChangeDocument }: HeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-glass bg-background/80">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <span className="text-lg font-semibold tracking-tight text-foreground" style={{ textShadow: '0 0 8px rgba(211,211,211,0.3)' }}>
              DocuMind
            </span>

            {/* Tabs - beside logo */}
            <nav className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition-all relative ${
                    activeTab === tab.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:brightness-110"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-active" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* File Info */}
          <div className="flex items-center gap-4 text-sm">
            {fileName && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">File:</span>
                  <span className="text-accent font-medium">{fileName}</span>
                </div>
                <button
                  onClick={onChangeDocument}
                  className="text-muted-foreground hover:text-foreground hover:brightness-110 transition-all"
                >
                  Change Document
                </button>
              </>
            )}
            <button className="p-2 hover:shadow-glow rounded-lg transition-all">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};