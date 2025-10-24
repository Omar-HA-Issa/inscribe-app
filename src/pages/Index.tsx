import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Header } from "@/components/Header";
import { Summary } from "@/components/sections/Summary";
import { Insights } from "@/components/sections/Insights";
import { Contradictions } from "@/components/sections/Contradictions";
import { Visuals } from "@/components/sections/Visuals";
import { Report } from "@/components/sections/Report";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    setIsAnalyzing(true);
    setFile(selectedFile);
    
    // Simulate analysis delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setActiveTab("summary");
    }, 2000);
  };

  const handleChangeDocument = () => {
    setFile(null);
    setActiveTab("summary");
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
      default:
        return <Summary />;
    }
  };

  if (!file) {
    return <FileUpload onFileSelect={handleFileSelect} />;
  }

  if (isAnalyzing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-16 h-16 mx-auto border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="text-xl font-semibold">Analyzing document...</p>
            <p className="text-muted-foreground">This may take a few moments</p>
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
