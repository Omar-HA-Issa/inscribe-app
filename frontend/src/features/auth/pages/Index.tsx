import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {FileUpload} from "../../../shared/components/FileUpload.tsx";
import {Header} from "../../../shared/components/Header.tsx";
import {Summary} from "../../documents/pages/Summary.tsx";
import {Insights} from "../../documents/pages/Insights.tsx";
import {Contradictions} from "../../documents/pages/Contradictions.tsx";
import {Visuals} from "../../documents/pages/Visuals.tsx";
import {Report} from "../../documents/pages/Report.tsx";
import {Chat} from "../../chat/Chat.tsx";
import {Sidebar} from "../../chat/Sidebar.tsx";
import {uploadDocument} from "@/shared/lib/apiClient.ts";
import {useToast} from "@/shared/hooks/use-toast.ts";
import {useAuth} from "../context/AuthContext.tsx";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const { toast } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedFileName = localStorage.getItem("currentFileName");
    const savedDocumentId = localStorage.getItem("currentDocumentId");
    const savedTab = localStorage.getItem("activeTab");

    if (savedFileName) {
      setFileName(savedFileName);
      const fakeFile = new File([], savedFileName);
      setFile(fakeFile);
    }
    if (savedDocumentId) setDocumentId(savedDocumentId);
    if (savedTab) setActiveTab(savedTab);
  }, []);

  useEffect(() => {
    if (fileName) localStorage.setItem("currentFileName", fileName);
    if (documentId) localStorage.setItem("currentDocumentId", documentId);
    localStorage.setItem("activeTab", activeTab);
  }, [fileName, documentId, activeTab]);

  const handleFileSelect = async (selectedFile: File) => {
    setIsAnalyzing(true);
    setFile(selectedFile);
    setFileName(selectedFile.name);

    try {
      const response = await uploadDocument(selectedFile);

      if (response.success && response.document) {
        setDocumentId(response.document.id);
        toast({
          title: "Upload successful!",
          description: `${response.document.filename} has been uploaded and processed.`,
        });
        setIsAnalyzing(false);
        setActiveTab("summary");
      } else {
        throw new Error(response.message || "Upload failed");
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload document. Please try again.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
      setFile(null);
      setFileName(null);
      setDocumentId(null);
    }
  };

  const handleChangeDocument = () => {
    localStorage.removeItem("currentFileName");
    localStorage.removeItem("currentDocumentId");
    localStorage.removeItem("activeTab");
    setFile(null);
    setFileName(null);
    setDocumentId(null);
    setActiveTab("summary");
    setSelectedDocs([]);
  };

  const handleLogout = async () => {
    try {
      // Clear document state
      localStorage.removeItem("currentFileName");
      localStorage.removeItem("currentDocumentId");
      localStorage.removeItem("activeTab");

      // Call logout from AuthContext (clears tokens)
      await logout();

      // Show success message
      toast({
        title: "Logged out successfully",
        description: "See you next time!",
      });

      // Redirect to login
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an issue logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderSection = () => {
    switch (activeTab) {
      case "summary":
        return <Summary />;
      case "insights":
        return <Insights />;
      case "contradictions":
        return <Contradictions />;
      case "visuals":
        return <Visuals />;
      case "report":
        return <Report />;
      case "chat":
        // Full-height layout under header, no width constraint
        return (
          <div className="flex h-[calc(100vh-6rem)] border rounded-lg overflow-hidden">
            <Sidebar
              selectedDocs={selectedDocs}
              setSelectedDocs={setSelectedDocs}
            />
            <Chat selectedDocs={selectedDocs} />
          </div>
        );
      default:
        return <Summary />;
    }
  };

  if (!file) return <FileUpload onFileSelect={handleFileSelect} />;

  if (isAnalyzing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-16 h-16 mx-auto border-4 border-chart-mid border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="text-xl font-semibold">Uploading and analyzing document...</p>
            <p className="text-muted-foreground">Extracting text and processing content</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        fileName={fileName || file.name}
        onChangeDocument={handleChangeDocument}
        onLogout={handleLogout}
      />

      {/* Remove max-width container so Chat can span full width */}
      <main className="px-6 pt-28 pb-6">{renderSection()}</main>
    </div>
  );
};

export default Index;