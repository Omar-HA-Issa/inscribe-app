import {useEffect, useState} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {FileUpload} from "../../shared/components/FileUpload.tsx";
import {LoadingSpinner} from "@/shared/components/LoadingSpinner.tsx";
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
    // Only show "Back to Document" button if user explicitly clicked "Change Document"
    // Extract document ID from location state if user clicked "Change Document"
    const state = location.state as { fromDocumentId?: string } | null;
    if (state?.fromDocumentId) {
      setLastDocumentId(state.fromDocumentId);
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

      let errorMessage = "Failed to upload document. Please try again.";

      // Extract error message from various error object formats
      if (typeof error?.userMessage === 'string') {
        errorMessage = error.userMessage;
      } else if (typeof error?.message === 'string') {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        const errorStr = JSON.stringify(error);
        if (errorStr && errorStr !== '{}') {
          errorMessage = errorStr;
        }
      }

      toast({
        title: "Upload failed",
        description: String(errorMessage),
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
      <LoadingSpinner
        message="Uploading and analyzing document..."
        subMessage="Extracting text and processing content"
        fullScreen
      />
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