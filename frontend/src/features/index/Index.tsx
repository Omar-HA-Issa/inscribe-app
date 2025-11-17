import {useEffect, useState} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {FileUpload} from "../../shared/components/FileUpload.tsx";
import {uploadDocument} from "@/shared/lib/apiClient.ts";
import {useToast} from "@/shared/hooks/use-toast.ts";
import {useAuth} from "../auth/context/AuthContext.tsx";

const Index = () => {
  const [showUploadPage, setShowUploadPage] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastDocumentId, setLastDocumentId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we came from a document page
  useEffect(() => {
    // Extract document ID from location state if user clicked "Change Document"
    const state = location.state as { fromDocumentId?: string } | null;
    if (state?.fromDocumentId) {
      setLastDocumentId(state.fromDocumentId);
    } else {
      // Try to get last viewed document from localStorage
      const lastDoc = localStorage.getItem('lastViewedDocument');
      if (lastDoc) {
        setLastDocumentId(lastDoc);
      }
    }
  }, [location]);

  const handleFileSelect = async (selectedFile: File) => {
    setIsAnalyzing(true);

    try {
      const response = await uploadDocument(selectedFile);

      if (response.success && response.document) {
        toast({
          title: "Upload successful!",
          description: `${response.document.file_name || selectedFile.name} has been uploaded and processed.`,
        });

        localStorage.setItem('lastViewedDocument', response.document.id);

        navigate(`/documents/${response.document.id}/summary`);
      } else {
        throw new Error(response.message || "Upload failed");
      }
    } catch (error: any) {
      console.error("❌ Upload error:", error);

      const errorMessage =
          error?.message?.includes("already exists")
              ? error.message
              : error instanceof Error
                  ? error.message
                  : "Failed to upload document. Please try again.";

      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });

      setIsAnalyzing(false);
    }
  };

  const handleSelectExistingDocument = (documentId: string, fileName: string) => {
    toast({
      title: "Document loaded",
      description: `Viewing ${fileName}`,
    });

    localStorage.setItem('lastViewedDocument', documentId);

    navigate(`/documents/${documentId}/summary`);
  };

  const handleBackToDocument = () => {
    if (lastDocumentId) {
      navigate(`/documents/${lastDocumentId}/summary`);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
    <FileUpload
      onFileSelect={handleFileSelect}
      hasExistingDocument={!!lastDocumentId}
      onBackToDocument={lastDocumentId ? handleBackToDocument : undefined}
      onSelectExistingDocument={handleSelectExistingDocument}
    />
  );
};

export default Index;