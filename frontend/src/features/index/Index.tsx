import {useEffect, useState} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {FileUpload} from "../../shared/components/FileUpload.tsx";
import {UploadConfirmation} from "../../shared/components/UploadConfirmation.tsx";
import {LoadingSpinner} from "@/shared/components/LoadingSpinner.tsx";
import {uploadDocument} from "@/shared/lib/apiClient.ts";
import {useToast} from "@/shared/hooks/use-toast.ts";
import {useAuth} from "../auth/context/AuthContext.tsx";
import {useUploadStatus} from "@/shared/hooks/useUploadStatus";
import {AlertCircle} from "lucide-react";
import {Footer} from "@/shared/components/Footer";

const Index = () => {
  const [showUploadPage, setShowUploadPage] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastDocumentId, setLastDocumentId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [nonTechnicalError, setNonTechnicalError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { uploadStatus } = useUploadStatus(true);

  // Check if we came from a document page
  useEffect(() => {
    // Only show "Back to Document" button if user explicitly clicked "Change Document"
    // Extract document ID from location state if user clicked "Change Document"
    const state = location.state as { fromDocumentId?: string } | null;
    if (state?.fromDocumentId) {
      setLastDocumentId(state.fromDocumentId);
    }
  }, [location]);

  const handleFileSelect = (selectedFile: File) => {
    setPendingFile(selectedFile);
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;

    setIsAnalyzing(true);
    setPendingFile(null);

    try {
      const response = await uploadDocument(pendingFile);

      if (response.success && response.document) {
        toast({
          title: "Upload successful!",
          description: `${response.document.file_name || pendingFile.name} has been uploaded and processed.`,
        });

        localStorage.setItem('lastViewedDocument', response.document.id);

        navigate(`/documents/${response.document.id}/summary`);
      } else {
        throw new Error(response.message || "Upload failed");
      }
    } catch (error: unknown) {
      console.error("❌ Upload error:", error);

      let errorMessage = "Failed to upload document. Please try again.";
      let errorTitle = "Upload failed";
      let isNonTechnical = false;

      // Extract error message from various error object formats
      const err = error as { userMessage?: string; message?: string } | null;
      if (typeof err?.userMessage === 'string') {
        errorMessage = err.userMessage;
        // Check if it's a non-technical document error
        if (errorMessage.includes("doesn't appear to be technical")) {
          errorTitle = "Non-Technical Document";
          isNonTechnical = true;
        }
      } else if (typeof err?.message === 'string') {
        errorMessage = err.message;
        if (errorMessage.includes("doesn't appear to be technical")) {
          errorTitle = "Non-Technical Document";
          isNonTechnical = true;
        }
      } else if (error && typeof error === 'object') {
        const errorStr = JSON.stringify(error);
        if (errorStr && errorStr !== '{}') {
          errorMessage = errorStr;
        }
      }

      // Show centered popup for non-technical documents
      if (isNonTechnical) {
        setNonTechnicalError(errorMessage);
      } else {
        // Show toast for other errors
        toast({
          title: errorTitle,
          description: String(errorMessage),
          variant: "destructive",
        });
      }

      setIsAnalyzing(false);
    }
  };

  const handleCancelUpload = () => {
    setPendingFile(null);
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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1">
        <FileUpload
          onFileSelect={handleFileSelect}
          hasExistingDocument={!!lastDocumentId}
          onBackToDocument={lastDocumentId ? handleBackToDocument : undefined}
          onSelectExistingDocument={handleSelectExistingDocument}
        />

        {pendingFile && (
          <UploadConfirmation
            file={pendingFile}
            onConfirm={handleConfirmUpload}
            onCancel={handleCancelUpload}
            uploadStatus={uploadStatus}
          />
        )}

        {/* Non-Technical Document Popup */}
        {nonTechnicalError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-md"
              onClick={() => setNonTechnicalError(null)}
              aria-hidden="true"
            />

            {/* Centered Popup */}
            <div
              className="relative bg-card rounded-2xl shadow-xl max-w-md w-full p-6 animate-slide-in"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-full">
                  <AlertCircle className="w-10 h-10 text-yellow-500" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Document is not technical
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This system is designed for technical documents related to software development, DevOps, and system architecture.
                  </p>
                </div>
                <button
                  onClick={() => setNonTechnicalError(null)}
                  className="w-full px-4 py-2.5 rounded-lg font-medium bg-muted hover:bg-muted/80 text-foreground transition-all"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Index;