/**
 * FileUpload Component
 * SOLID Principles:
 * - Single Responsibility: Focused on UI rendering
 * - Separation of Concerns: API logic delegated to hooks and utilities
 * - Dependency Inversion: Uses abstracted hooks and utilities
 */

import { useCallback, useEffect, useReducer, useState } from "react";
import { FileText, Upload, ArrowLeft, Clock, Search, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils.ts";
import { useAsync } from "@/shared/hooks/useAsync";
import { useDocumentDelete } from "@/shared/hooks/useFileUpload";
import { fetchUserDocuments } from "@/shared/lib/apiClient.ts";
import { validateFile, formatFileSize, formatDate } from "@/shared/lib/validation";
import { ApiError } from "@/shared/lib/errorHandler";

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

/**
 * Reducer state for document library view
 */
interface LibraryState {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  deleteConfirm: { id: string; name: string } | null;
}

type LibraryAction =
  | { type: 'SET_DOCUMENTS'; payload: Document[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_DELETE_CONFIRM'; payload: { id: string; name: string } | null }
  | { type: 'REMOVE_DOCUMENT'; payload: string }
  | { type: 'RESET' };

/**
 * Reducer for managing library state
 */
function libraryReducer(state: LibraryState, action: LibraryAction): LibraryState {
  switch (action.type) {
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload, error: null, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_DELETE_CONFIRM':
      return { ...state, deleteConfirm: action.payload };
    case 'REMOVE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.filter(d => d.id !== action.payload),
      };
    case 'RESET':
      return {
        documents: [],
        isLoading: false,
        error: null,
        searchQuery: '',
        deleteConfirm: null,
      };
    default:
      return state;
  }
}

export const FileUpload = ({
  onFileSelect,
  hasExistingDocument,
  onBackToDocument,
  onSelectExistingDocument
}: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Use reducer for related library state
  const [libraryState, dispatch] = useReducer(libraryReducer, {
    documents: [],
    isLoading: false,
    error: null,
    searchQuery: '',
    deleteConfirm: null,
  });

  // Use custom hook for document fetching
  const fetchDocuments = useCallback(() => fetchUserDocuments(), []);
  const { status: fetchStatus, data: documentsData, execute: loadDocuments } = useAsync(
    fetchDocuments,
    false
  );

  // Use custom hook for document deletion
  const { deleteDocument, isDeleting } = useDocumentDelete();

  // Update library state when documents are fetched
  useEffect(() => {
    if (fetchStatus === 'success' && documentsData) {
      dispatch({
        type: 'SET_DOCUMENTS',
        payload: documentsData.documents || [],
      });
    } else if (fetchStatus === 'loading') {
      dispatch({ type: 'SET_LOADING', payload: true });
    } else if (fetchStatus === 'error') {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Failed to load documents',
      });
    }
  }, [fetchStatus, documentsData, dispatch]);

  // Load documents when library view is opened
  useEffect(() => {
    if (showLibrary && libraryState.documents.length === 0) {
      loadDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLibrary, libraryState.documents.length]);

  /**
   * Handles file drop
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file) return;

      const validation = validateFile(file);
      if (!validation.isValid) {
        setUploadError(validation.error || 'Invalid file');
        return;
      }

      setUploadError(null);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  /**
   * Handles drag over
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  /**
   * Handles drag leave
   */
  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Handles file input change
   */
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validation = validateFile(file);
      if (!validation.isValid) {
        setUploadError(validation.error || 'Invalid file');
        e.target.value = '';
        return;
      }

      setUploadError(null);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  /**
   * Handles document selection from library
   */
  const handleDocumentSelect = useCallback(
    (doc: Document) => {
      if (onSelectExistingDocument) {
        onSelectExistingDocument(doc.id, doc.file_name);
      }
    },
    [onSelectExistingDocument]
  );

  /**
   * Initiates document deletion
   */
  const handleDeleteDocument = useCallback(
    (e: React.MouseEvent, docId: string, fileName: string) => {
      e.stopPropagation();
      dispatch({
        type: 'SET_DELETE_CONFIRM',
        payload: { id: docId, name: fileName },
      });
    },
    []
  );

  /**
   * Confirms and executes document deletion
   */
  const confirmDelete = useCallback(async () => {
    const { id: docId } = libraryState.deleteConfirm || {};
    if (!docId) return;

    setDeletingDocId(docId);

    try {
      await deleteDocument(docId);
      dispatch({ type: 'REMOVE_DOCUMENT', payload: docId });
      dispatch({ type: 'SET_DELETE_CONFIRM', payload: null });
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.userMessage : 'Failed to delete document';
      setUploadError(errorMessage);
    } finally {
      setDeletingDocId(null);
    }
  }, [libraryState.deleteConfirm, deleteDocument]);

  /**
   * Cancels deletion
   */
  const cancelDelete = useCallback(() => {
    dispatch({ type: 'SET_DELETE_CONFIRM', payload: null });
  }, []);

  // Filter documents based on search query
  const filteredDocuments = libraryState.documents.filter(doc =>
    doc.file_name.toLowerCase().includes(libraryState.searchQuery.toLowerCase()) ||
    doc.title.toLowerCase().includes(libraryState.searchQuery.toLowerCase())
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 animate-fade-in relative"
      role="main"
      aria-label="File upload and document management"
    >
      {/* Back to Current Document Button */}
      {hasExistingDocument && onBackToDocument && (
        <button
          onClick={onBackToDocument}
          className="absolute top-8 left-8 flex items-center gap-2 px-4 py-2 rounded-lg
                     bg-card hover:bg-muted transition-all duration-200
                     text-muted-foreground hover:text-foreground
                     shadow-card hover:shadow-hover
                     group"
          aria-label="Return to current document"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">Back to Document</span>
        </button>
      )}

      <div className="text-center mb-12">
        <h1 className="text-5xl font-semibold tracking-tight mb-4"
            style={{textShadow: '0 0 12px rgba(211,211,211,0.3)'}}>
          DocuMind
        </h1>
        <p className="text-muted-foreground text-lg">
          Upload a document or select from your library to get started
        </p>
      </div>

      {!showLibrary ? (
          <div className="w-full max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upload New Document */}
              <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={cn(
                      "relative p-16 rounded-2xl transition-all cursor-pointer h-full",
                      "bg-card shadow-card hover:shadow-hover",
                      isDragging ? "shadow-glow" : ""
                  )}
                  role="button"
                  tabIndex={0}
                  aria-label="Drop area for file upload or click to browse"
              >
                <input
                    type="file"
                    accept=".pdf,.txt,.docx"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label="Select file to upload"
                />

                <div className="flex flex-col items-center gap-6">
                  <div className="p-6 rounded-full bg-muted">
                    {isDragging ? (
                        <FileText className="w-12 h-12 text-foreground"/>
                    ) : (
                        <Upload className="w-12 h-12 text-foreground"/>
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
                      Supports PDF, TXT, and DOCX files (max 10MB, 50 pages for PDFs)
                    </p>
                  </div>
                </div>
              </div>

              {/* Select Existing Document */}
              <button
                  onClick={() => setShowLibrary(true)}
                  className="w-full p-16 rounded-2xl transition-all
                 bg-card hover:bg-muted shadow-card hover:shadow-hover
                 flex flex-col items-center gap-6 group h-full"
              >
                <div className="p-6 rounded-full bg-muted group-hover:bg-card transition-all">
                  <Clock className="w-12 h-12 text-foreground"/>
                </div>
                <div className="text-center">
                  <p className="text-xl font-medium mb-2">Select from library</p>
                  <p className="text-muted-foreground">
                    Choose a previously uploaded document
                  </p>
                </div>
              </button>
            </div>
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
                    value={libraryState.searchQuery}
                    onChange={(e) => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 rounded-lg
                           bg-muted border border-border
                           text-foreground placeholder:text-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-accent/50
                           transition-all"
                    aria-label="Search documents by name"
                />
              </div>

              {/* Document List */}
              {libraryState.isLoading ? (
                  <div
                    className="flex items-center justify-center py-12"
                    role="status"
                    aria-label="Loading documents"
                  >
                    <div className="w-8 h-8 border-4 border-chart-mid border-t-transparent rounded-full animate-spin" />
                  </div>
              ) : filteredDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      {libraryState.searchQuery ? 'No documents match your search' : 'No documents uploaded yet'}
                    </p>
              </div>
            ) : (
              <div
                className="space-y-2 max-h-96 overflow-y-auto"
                role="list"
                aria-label="List of uploaded documents"
              >
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="w-full p-4 rounded-lg
                               bg-muted hover:bg-card hover:shadow-hover
                               transition-all group flex items-start gap-3"
                    role="listitem"
                  >
                    <button
                      onClick={() => handleDocumentSelect(doc)}
                      className="flex-1 flex items-start gap-3 min-w-0 text-left"
                      aria-label={`Select document: ${doc.file_name}`}
                    >
                      <div className="p-2 bg-card group-hover:bg-muted rounded-lg transition-all">
                        <FileText className="w-5 h-5 text-foreground" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {doc.file_name}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span aria-hidden="true">•</span>
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
                      aria-label={`Delete document: ${doc.file_name}`}
                    >
                      {deletingDocId === doc.id ? (
                        <div
                          className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Trash2 className="w-5 h-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Error Notification */}
      {uploadError && (
        <div
          className="fixed top-8 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-slide-in"
          role="alert"
          aria-live="assertive"
          aria-labelledby="error-title"
        >
          <div className="bg-card border border-red-500/50 rounded-xl p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Upload className="w-5 h-5 text-red-500" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-red-500 mb-1" id="error-title">Upload Failed</h3>
                <p className="text-sm text-foreground whitespace-pre-line">{uploadError}</p>
              </div>
              <button
                onClick={() => setUploadError(null)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss error notification"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {libraryState.deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={cancelDelete}
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            className="relative bg-card rounded-2xl shadow-xl max-w-md w-full p-6 animate-slide-in"
            role="alertdialog"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-description"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-500" aria-hidden="true" />
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2" id="delete-modal-title">Delete Document</h3>
                <div id="delete-modal-description">
                  <p className="text-muted-foreground mb-1">
                    Are you sure you want to delete
                  </p>
                  <p className="text-foreground font-medium mb-3">
                    "{libraryState.deleteConfirm.name}"?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This action cannot be undone.
                  </p>
                </div>
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
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-lg font-medium
                           bg-red-500 hover:bg-red-600 text-white
                           transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};