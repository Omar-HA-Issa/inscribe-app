import {useCallback, useState} from "react";
import {FileText, Upload, ArrowLeft} from "lucide-react";
import {cn} from "@/shared/lib/utils.ts";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  hasExistingDocument?: boolean;
  onBackToDocument?: () => void;
}

export const FileUpload = ({ onFileSelect, hasExistingDocument, onBackToDocument }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && (file.type === "application/pdf" ||
                   file.type === "text/plain" ||
                   file.type === "text/csv" ||
                   file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-fade-in relative">
      {/* Back to Current Document Button - Only shows if there's an existing document */}
      {hasExistingDocument && onBackToDocument && (
        <button
          onClick={onBackToDocument}
          className="absolute top-8 left-8 flex items-center gap-2 px-4 py-2 rounded-lg
                     bg-card hover:bg-muted transition-all duration-200
                     text-muted-foreground hover:text-foreground
                     shadow-card hover:shadow-hover
                     group"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">Back to Document</span>
        </button>
      )}

      <div className="text-center mb-12">
        <h1 className="text-5xl font-semibold tracking-tight mb-4" style={{ textShadow: '0 0 12px rgba(211,211,211,0.3)' }}>
          DocuMind
        </h1>
        <p className="text-muted-foreground text-lg">
          Discover what your documents hide beneath the surface
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative w-full max-w-2xl p-16 rounded-2xl transition-all cursor-pointer",
          "bg-card shadow-card hover:shadow-hover",
          isDragging
            ? "shadow-glow"
            : ""
        )}
      >
        <input
          type="file"
          accept=".pdf,.txt,.csv,.docx"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center gap-6">
          <div className="p-6 rounded-full bg-muted">
            {isDragging ? (
              <FileText className="w-12 h-12 text-foreground" />
            ) : (
              <Upload className="w-12 h-12 text-foreground" />
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
              Supports PDF, TXT, CSV, and DOCX files
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};