import { useState } from "react";
import { FileUpload } from "../components/FileUpload";
import { Header } from "../components/Header";
import { Summary } from "../components/sections/Summary";
import { Insights } from "../components/sections/Insights";
import { Contradictions } from "../components/sections/Contradictions";
import { Visuals } from "../components/sections/Visuals";
import { Report } from "../components/sections/Report";
import { uploadDocument } from "../lib/api";
import { useToast } from "../hooks/use-toast";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (selectedFile: File) => {
    setIsAnalyzing(true);
    setFile(selectedFile);

    try {
      // Upload the file to backend
      console.log('📤 Uploading file:', selectedFile.name);
      const response = await uploadDocument(selectedFile);

      if (response.success && response.document) {
        console.log('✅ Upload successful:', response.document);
        setDocumentId(response.document.id);

        // Show success toast
        toast({
          title: "Upload successful!",
          description: `${response.document.filename} has been uploaded and processed.`,
        });

        // Move to summary view
        setIsAnalyzing(false);
        setActiveTab("summary");
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);

      // Show error toast
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document. Please try again.",
        variant: "destructive",
      });

      // Reset state on error
      setIsAnalyzing(false);
      setFile(null);
      setDocumentId(null);
    }
  };

  const handleChangeDocument = () => {
    setFile(null);
    setDocumentId(null);
    setActiveTab("summary");
  };

  const renderSection = () => {
    switch (activeTab) {
      case "summary":
        return <Summary/>;
      case "insights":
        return <Insights/>;
      case "contradictions":
        return <Contradictions/>;
      case "visuals":
        return <Visuals/>;
      case "report":
        return <Report/>;
      default:
        return <Summary/>;
    }
  };

  if (!file) {
    return <FileUpload onFileSelect={handleFileSelect} />;
  }

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
        fileName={file.name}
        onChangeDocument={handleChangeDocument}
      />

      <main className="container mx-auto px-6 pt-28 pb-16">
        <div className="max-w-6xl mx-auto">
          {renderSection()}
        </div>
      </main>
    </div>
  );
};

export default Index;