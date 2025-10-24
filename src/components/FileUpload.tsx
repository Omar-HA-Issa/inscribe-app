import { useCallback, useState } from "react";
import { Upload, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload = ({ onFileSelect }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const file = e.dataTransfer.files[0];
      if (file && (file.type === "application/pdf" || 
                   file.type === "text/plain" || 
                   file.type === "text/csv")) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Sparkles className="w-8 h-8 text-accent animate-shimmer" />
          <h1 className="text-5xl font-semibold tracking-tight">DocuMind</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Discover what your documents hide beneath the surface
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative w-full max-w-2xl p-16 rounded-2xl border-2 border-dashed transition-all cursor-pointer",
          "bg-card shadow-card hover:shadow-hover",
          isDragging
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50"
        )}
      >
        <input
          type="file"
          accept=".pdf,.txt,.csv"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center gap-6">
          <div className="p-6 rounded-full bg-accent/10">
            {isDragging ? (
              <FileText className="w-12 h-12 text-accent" />
            ) : (
              <Upload className="w-12 h-12 text-accent" />
            )}
          </div>
          
          <div className="text-center">
            <p className="text-xl font-medium mb-2">
              {isDragging ? "Drop your document here" : "Upload document"}
            </p>
            <p className="text-muted-foreground">
              Drag & drop or click to browse
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Supports PDF, TXT, and CSV files
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
