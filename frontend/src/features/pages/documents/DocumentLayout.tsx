import { useParams, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/shared/lib/api";
import { Header } from "@/shared/components/Header";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner.tsx";
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


  // Get current tab from URL path
  const currentTab = location.pathname.split("/").pop() || "summary";

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
      <LoadingSpinner message="Loading document..." fullScreen />
    );
  }

  // Define tabs with Document-specific labels
  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "insights", label: "Insights" },
    { id: "contradictions", label: "Validation" },
    { id: "report", label: "Report" },
    { id: "chat", label: "Chat" },
  ];

  // Special layout for Chat tab
  if (currentTab === "chat") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header
          activeTab={currentTab}
          onTabChange={(tab) => navigate(`/documents/${id}/${tab}`)}
          fileName={document?.file_name}
          onChangeDocument={() => navigate("/", { state: { fromDocumentId: id } })}
          onLogout={handleLogout}
          tabs={tabs}
        />

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
      <Header
        activeTab={currentTab}
        onTabChange={(tab) => navigate(`/documents/${id}/${tab}`)}
        fileName={document?.file_name}
        onChangeDocument={() => navigate("/", { state: { fromDocumentId: id } })}
        onLogout={handleLogout}
        tabs={tabs}
      />

      {/* Content Area with padding for fixed header */}
      <main className="px-6 pt-28 pb-6">
        <Outlet />
      </main>
    </div>
  );
}