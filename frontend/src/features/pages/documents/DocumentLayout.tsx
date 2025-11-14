import { useParams, Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/shared/lib/api";
import { LogOut, Settings, FileText, ArrowLeft } from "lucide-react";
import Logo from "@/shared/assets/images/DocuMind_Logo.png";
// Fix paths based on actual location
import { Chat } from "../chat/Chat.tsx";
import { Sidebar } from "../chat/Sidebar.tsx";
import { useAuth } from "../../auth/context/AuthContext.tsx";
import { useToast } from "@/shared/hooks/use-toast.ts";

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  created_at: string;
}

export default function DocumentLayout() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) return;

      try {
        const response = await api.get<{ documents: Document[] }>("/api/documents");
        const doc = response.documents.find((d) => d.id === id);
        setDocument(doc || null);

        // Auto-select current document for chat
        if (doc) {
          setSelectedDocs([doc.id]);
        }
      } catch (err) {
        console.error("Failed to fetch document:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isSettingsOpen && !target.closest('[data-settings-menu]')) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      window.document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      window.document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "insights", label: "Insights" },
    { id: "contradictions", label: "Contradictions" },
    // { id: "visuals", label: "Visuals" },
    { id: "report", label: "Report" },
    { id: "chat", label: "Chat" },
  ];

  // Get current tab from URL path
  const currentTab = location.pathname.split("/").pop();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out successfully",
        description: "See you next time!",
      });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an issue logging out.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading document...</div>
      </div>
    );
  }

  // Special layout for Chat tab
  if (currentTab === "chat") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-glass bg-background/80 border-b border-border">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo + Tabs */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <img src={Logo} alt="DocuMind Logo" className="w-7 h-7 object-contain" />
                  <span className="text-lg font-semibold tracking-tight text-foreground">
                    DocuMind
                  </span>
                </div>

                <nav className="flex items-center gap-1">
                  {tabs.map((tab) => {
                    const isActive = currentTab === tab.id;
                    return (
                      <Link
                        key={tab.id}
                        to={`/documents/${id}/${tab.id}`}
                        className={`px-4 py-2 text-sm font-medium transition-all relative ${
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:brightness-110"
                        }`}
                      >
                        {tab.label}
                        {isActive && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-active" />
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* File info + Settings */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">File:</span>
                  <span className="text-accent font-medium">{document?.file_name || "Unknown"}</span>
                </div>
                <Link to="/" state={{ fromDocumentId: id }} className="text-muted-foreground hover:text-foreground hover:brightness-110 transition-all">
                  Change Document
                </Link>

                <div className="relative" data-settings-menu>
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

        {/* Chat Layout with Sidebar - Full height below header */}
        <div className="flex pt-20 h-screen">
          <Sidebar selectedDocs={selectedDocs} setSelectedDocs={setSelectedDocs} />
          <Chat selectedDocs={selectedDocs} />
        </div>
      </div>
    );
  }

  // Regular layout for other tabs
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-glass bg-background/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo + Tabs */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <img src={Logo} alt="DocuMind Logo" className="w-7 h-7 object-contain" />
                <span
                  className="text-lg font-semibold tracking-tight text-foreground"
                  style={{ textShadow: "0 0 8px rgba(211,211,211,0.3)" }}
                >
                  DocuMind
                </span>
              </div>

              {/* Tabs beside logo */}
              <nav className="flex items-center gap-1">
                {tabs.map((tab) => {
                  const isActive = currentTab === tab.id;
                  return (
                    <Link
                      key={tab.id}
                      to={`/documents/${id}/${tab.id}`}
                      className={`px-4 py-2 text-sm font-medium transition-all relative ${
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:brightness-110"
                      }`}
                    >
                      {tab.label}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-active" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* File info + Settings */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">File:</span>
                <span className="text-accent font-medium">{document?.file_name || "Unknown"}</span>
              </div>
              <Link
                to="/"
                state={{ fromDocumentId: id }}
                className="text-muted-foreground hover:text-foreground hover:brightness-110 transition-all"
              >
                Change Document
              </Link>

              <div className="relative" data-settings-menu>
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

      {/* Content Area with padding for fixed header */}
      <main className="px-6 pt-28 pb-6">
        <Outlet />
      </main>
    </div>
  );
}