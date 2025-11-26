import {LogOut, Settings} from "lucide-react";
import {useEffect, useRef, useState} from "react";
import Logo from "@/shared/assets/images/logo.png";

export interface Tab {
  id: string;
  label: string;
}

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  fileName?: string;
  onChangeDocument: () => void;
  onLogout?: () => void;
  tabs?: Tab[];
}

const defaultTabs: Tab[] = [
  { id: "summary", label: "Summary" },
  { id: "insights", label: "Insights" },
  { id: "contradictions", label: "Contradictions" },
  // { id: "visuals", label: "Visuals" },
  { id: "report", label: "Report" },
  { id: "chat", label: "Chat" },
];

export const Header = ({
  activeTab,
  onTabChange,
  fileName,
  onChangeDocument,
  onLogout,
  tabs = defaultTabs,
}: HeaderProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSettingsOpen]);

  const handleLogout = () => {
    setIsSettingsOpen(false);
    onLogout?.();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-glass bg-background/80">
      <div className="container mx-auto px-2 py-4">
        <div className="flex items-center justify-between">
          {/* Logo + Tabs */}
          <div className="flex items-center gap-8 -ml-2">

            <div className="flex items-center gap-2">
              <img
                  src={Logo}
                  alt="DocuMind Logo"
                  className="w-7 h-7 object-contain"
              />
              <span
                  className="text-lg font-semibold tracking-tight text-foreground"
                  style={{textShadow: "0 0 8px rgba(211,211,211,0.3)"}}
              >
                DocuMind
              </span>
            </div>

            {/* Tabs beside logo */}
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
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-active"/>
                    )}
                  </button>
              ))}
            </nav>
          </div>

          {/* File info + Settings */}
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

            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 hover:shadow-glow rounded-lg transition-all"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
              </button>

              {isSettingsOpen && (
                <div className="absolute right-0 mt-2 w-48 backdrop-blur-glass bg-background/95 border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
