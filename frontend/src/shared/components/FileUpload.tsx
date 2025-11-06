import {useCallback, useEffect, useState} from "react";
import {FileText, Upload, ArrowLeft, Clock, Search, Trash2} from "lucide-react";
import {cn} from "@/shared/lib/utils.ts";
import {fetchUserDocuments} from "@/shared/lib/apiClient.ts";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  hasExistingDocument?: boolean;
  onBackToDocument?: () => void;
  onSelectExistingDocument?: (documentId: string, fileName: string) => void;
}

interface Document {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  created_at: string;
  file_size: number;
}

export const FileUpload = ({
  onFileSelect,
  hasExistingDocument,
  onBackToDocument,
  onSelectExistingDocument
}: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (showLibrary) {
      loadDocuments();
    }
  }, [showLibrary]);

  const loadDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const response = await fetchUserDocuments();
      setDocuments(response.documents || []);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setIsLoadingDocs(false);
    }
  };

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

  const handleDocumentSelect = (doc: Document) => {
    if (onSelectExistingDocument) {
      onSelectExistingDocument(doc.id, doc.file_name);
    }
  };

  const handleDeleteDocument = async (e: React.MouseEvent, docId: string, fileName: string) => {
    e.stopPropagation(); // Prevent triggering document select
    setDeleteConfirm({ id: docId, name: fileName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    const { id: docId, name: fileName } = deleteConfirm;
    setDeletingDocId(docId);
    setDeleteConfirm(null);

    try {
      const token = localStorage.getItem('access_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete document');
      }

      const data = await response.json();

      // Remove from local state
      setDocuments(docs => docs.filter(d => d.id !== docId));

      console.log(`✅ ${data.message || 'Document deleted successfully'}`);
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete document. Please try again.');
    } finally {
      setDeletingDocId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const filteredDocuments = documents.filter(doc =>
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 animate-fade-in relative">
      {/* Back to Current Document Button */}
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

      {!showLibrary ? (
        <div className="w-full max-w-4xl space-y-6">
          {/* Upload New Document */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "relative p-16 rounded-2xl transition-all cursor-pointer",
              "bg-card shadow-card hover:shadow-hover",
              isDragging ? "shadow-glow" : ""
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
                  {isDragging ? "Drop your document here" : "Upload new document"}
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

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground">or</span>
            </div>
          </div>

          {/* Select Existing Document */}
          <button
            onClick={() => setShowLibrary(true)}
            className="w-full p-16 rounded-2xl transition-all
                       bg-card hover:bg-muted shadow-card hover:shadow-hover
                       flex flex-col items-center gap-6 group"
          >
            <div className="p-6 rounded-full bg-muted group-hover:bg-card transition-all">
              <Clock className="w-12 h-12 text-foreground" />
            </div>
            <div className="text-center">
              <p className="text-xl font-medium mb-2">Select from library</p>
              <p className="text-muted-foreground">
                Choose a previously uploaded document
              </p>
            </div>
          </button>
        </div>
      ) : (
        /* Document Library View */
        <div className="w-full max-w-4xl">
          <div className="bg-card rounded-2xl shadow-card p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold mb-1">Document Library</h2>
                <p className="text-muted-foreground text-sm">
                  {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setShowLibrary(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium
                           text-muted-foreground hover:text-foreground
                           bg-muted hover:bg-card transition-all"
              >
                Upload New
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg
                           bg-muted border border-border
                           text-foreground placeholder:text-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-accent/50
                           transition-all"
              />
            </div>

            {/* Document List */}
            {isLoadingDocs ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-chart-mid border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No documents match your search' : 'No documents uploaded yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="w-full p-4 rounded-lg
                               bg-muted hover:bg-card hover:shadow-hover
                               transition-all group flex items-start gap-3"
                  >
                    <button
                      onClick={() => handleDocumentSelect(doc)}
                      className="flex-1 flex items-start gap-3 min-w-0 text-left"
                    >
                      <div className="p-2 bg-card group-hover:bg-muted rounded-lg transition-all">
                        <FileText className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {doc.file_name}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteDocument(e, doc.id, doc.file_name)}
                      disabled={deletingDocId === doc.id}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100
                                 text-muted-foreground hover:text-red-500 hover:bg-red-500/10
                                 transition-all disabled:opacity-50"
                      title="Delete document"
                    >
                      {deletingDocId === doc.id ? (
                        <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={cancelDelete}
          />

          {/* Modal */}
          <div className="relative bg-card rounded-2xl shadow-xl max-w-md w-full p-6 animate-slide-in">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Delete Document</h3>
                <p className="text-muted-foreground mb-1">
                  Are you sure you want to delete
                </p>
                <p className="text-foreground font-medium mb-3">
                  "{deleteConfirm.name}"?
                </p>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2 rounded-lg font-medium
                           bg-muted hover:bg-card text-foreground
                           transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 rounded-lg font-medium
                           bg-red-500 hover:bg-red-600 text-white
                           transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};