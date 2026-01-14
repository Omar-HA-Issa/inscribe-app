/**
 * UploadConfirmation Component
 * Shows a confirmation overlay with document thumbnail before upload
 */

import { useEffect, useState } from "react";
import { FileText, Upload, X, File, FileType } from "lucide-react";
import { formatFileSize } from "@/shared/lib/validation";

interface UploadConfirmationProps {
  file: File;
  onConfirm: () => void;
  onCancel: () => void;
  uploadStatus?: { remaining: number; total: number; used: number } | null;
}

export const UploadConfirmation = ({
  file,
  onConfirm,
  onCancel,
  uploadStatus,
}: UploadConfirmationProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setIsVisible(true), 10);

    // Generate thumbnail for PDF files
    if (file.type === "application/pdf") {
      const url = URL.createObjectURL(file);
      setThumbnailUrl(url);

      return () => {
        URL.revokeObjectURL(url);
        clearTimeout(timer);
      };
    }

    return () => clearTimeout(timer);
  }, [file]);

  const getFileIcon = () => {
    if (file.type === "application/pdf") {
      return <FileText className="w-24 h-24 text-red-500" />;
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return <FileType className="w-24 h-24 text-blue-500" />;
    } else {
      return <File className="w-24 h-24 text-foreground" />;
    }
  };

  const getFileTypeLabel = () => {
    if (file.type === "application/pdf") {
      return "PDF";
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return "DOCX";
    } else if (file.type === "text/plain") {
      return "TXT";
    } else {
      return file.name.split('.').pop()?.toUpperCase() || "FILE";
    }
  };

  const handleConfirm = () => {
    setIsVisible(false);
    setTimeout(onConfirm, 300); // Wait for exit animation
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(onCancel, 300); // Wait for exit animation
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-lg"
        onClick={handleCancel}
      />

      {/* Confirmation Card */}
      <div
        className={`relative bg-card rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden transition-all duration-300 transform ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
        style={{ maxHeight: "85vh" }}
      >
        {/* Close Button */}
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg
                     bg-muted hover:bg-card text-muted-foreground hover:text-foreground
                     transition-all duration-200 group"
          aria-label="Cancel upload"
        >
          <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
        </button>

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 gap-0 min-h-[500px]">
          {/* Left Side - Document Preview */}
          <div className="bg-muted p-8 flex flex-col items-center justify-center border-r border-border">
            <div
              className={`transition-all duration-500 delay-100 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              {/* Document Thumbnail/Icon */}
              <div className="mb-6 p-6 bg-card rounded-2xl shadow-card">
                {file.type === "application/pdf" && thumbnailUrl ? (
                  <div className="relative w-64 h-80 bg-white rounded-lg overflow-hidden shadow-lg">
                    <object
                      data={`${thumbnailUrl}#toolbar=0&navpanes=0&view=FitH`}
                      type="application/pdf"
                      className="w-full h-full"
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        {getFileIcon()}
                      </div>
                    </object>
                  </div>
                ) : (
                  <div className="w-64 h-80 bg-card rounded-lg shadow-lg flex items-center justify-center border-2 border-border">
                    {getFileIcon()}
                  </div>
                )}
              </div>

              {/* File Details */}
              <div className="text-center space-y-2">
                <p
                  className="font-medium text-foreground text-lg truncate max-w-xs"
                  title={file.name}
                >
                  {file.name}
                </p>
                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                  <span className="uppercase font-semibold">{getFileTypeLabel()}</span>
                  <span>•</span>
                  <span>{formatFileSize(file.size)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Confirmation Actions */}
          <div className="p-8 flex flex-col justify-center">
            <div
              className={`space-y-6 transition-all duration-500 delay-200 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              {/* Header */}
              <div className="space-y-3">
                <div className="inline-flex p-3 bg-accent/10 rounded-xl">
                  <Upload className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-3xl font-semibold">Confirm Upload</h2>
                <p className="text-muted-foreground text-lg">
                  You're about to upload this document. It will be processed and
                  analyzed for insights.
                </p>
              </div>

              {/* Disclaimer */}
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground text-center">
                  By uploading, you confirm that you have the rights to process this document.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-5 py-2.5 rounded-lg font-medium text-sm
                           bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400
                           transition-all duration-200 hover:shadow-md
                           border border-red-500/30 hover:border-red-500/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-5 py-2.5 rounded-lg font-medium text-sm
                           bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400
                           transition-all duration-200 hover:shadow-md
                           border border-green-500/30 hover:border-green-500/50
                           flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Confirm Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
