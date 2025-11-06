import {useEffect, useState} from "react";
import {fetchUserDocuments, uploadDocument} from "@/shared/lib/apiClient.ts";
import {CheckSquare, ChevronLeft, ChevronRight, Search, Square, Trash2, Upload} from "lucide-react";

type Document = {
  id: string;
  title: string;
  file_name: string;
  created_at: string;
};

type SidebarProps = {
  selectedDocs: string[];
  setSelectedDocs: (docs: string[]) => void;
};

export function Sidebar({ selectedDocs, setSelectedDocs }: SidebarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const data = await fetchUserDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadDocument(file);
      await loadDocuments();
      console.log('✅ Upload successful!');
    } catch (err) {
      console.error("Upload failed:", err);
      alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleDocument = (docId: string) => {
    if (selectedDocs.includes(docId)) {
      setSelectedDocs(selectedDocs.filter(id => id !== docId));
    } else {
      setSelectedDocs([...selectedDocs, docId]);
    }
  };

  const deleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Delete this document? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/documents/${docId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        setSelectedDocs(selectedDocs.filter(id => id !== docId));
        await loadDocuments();
      } else {
        alert('Failed to delete document');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete document');
    }
  };

  const selectAll = () => {
    setSelectedDocs(filteredDocuments.map(doc => doc.id));
  };

  const clearAll = () => {
    setSelectedDocs([]);
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isCollapsed) {
    return (
      <div className="w-16 bg-background border-r border-border flex flex-col items-center h-[calc(100vh-6rem)] py-6 gap-6 transition-all duration-300">
        {/* Expand Button */}
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg hover:bg-foreground/5 transition-colors text-muted-foreground hover:text-foreground"
          title="Expand sidebar"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Selected Count Indicator */}
        {selectedDocs.length > 0 && (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#a855f7] via-[#8b5cf6] to-[#6366f1] flex items-center justify-center shadow-glow">
            <span className="text-xs font-semibold text-white">{selectedDocs.length}</span>
          </div>
        )}

        {/* Upload Button (Collapsed) */}
        <label className="mt-auto p-2 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground">
          <Upload className="w-5 h-5" />
          <input
            type="file"
            accept=".pdf,.docx,.txt,.csv"
            onChange={handleUpload}
            className="hidden"
            disabled={isUploading}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="w-80 bg-background border-r border-border flex flex-col h-[calc(100vh-6rem)] transition-all duration-300">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-foreground text-lg font-semibold tracking-tight">Documents</h2>
            <div className="flex items-center gap-3">
              {selectedDocs.length > 0 && (
                <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#a855f7] via-[#8b5cf6] to-[#6366f1] text-xs font-semibold text-white shadow-glow">
                  {selectedDocs.length}
                </div>
              )}
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors text-muted-foreground hover:text-foreground"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-foreground/5 rounded-xl
                text-foreground text-sm placeholder-muted-foreground
                focus:outline-none focus:ring-1 focus:ring-border
                transition-all border-0"
            />
          </div>

          {/* Quick Actions */}
          {documents.length > 0 && (
            <div className="flex gap-3 text-sm">
              <button
                onClick={selectAll}
                className="text-foreground hover:text-foreground/80 transition-colors font-medium"
              >
                Select All
              </button>
              <span className="text-border">•</span>
              <button
                onClick={clearAll}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">
                {searchQuery ? "No matching documents" : "No documents yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocuments.map((doc) => {
                const isSelected = selectedDocs.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDocument(doc.id)}
                    className={`
                      group relative p-4 rounded-xl cursor-pointer transition-all duration-200
                      ${isSelected 
                        ? 'bg-gradient-to-r from-[#a855f7]/10 via-[#8b5cf6]/10 to-[#6366f1]/10 ring-1 ring-[#8b5cf6]/20' 
                        : 'hover:bg-foreground/5'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="mt-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#8b5cf6]" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                      </div>

                      {/* Document Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate font-medium transition-colors ${
                          isSelected ? 'text-foreground' : 'text-foreground'
                        }`}>
                          {doc.file_name}
                        </p>
                        <p className="text-muted-foreground text-xs mt-1">
                          {new Date(doc.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => deleteDocument(doc.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-400 transition-colors" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload Button */}
      <div className="p-6 pt-4 border-t border-border">
        <label className="flex items-center justify-center gap-2 px-4 py-3
          rounded-xl cursor-pointer text-sm font-medium
          bg-gradient-to-r from-[#a855f7] via-[#8b5cf6] to-[#6366f1]
          hover:shadow-glow
          text-white transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed">
          <Upload className="w-4 h-4" />
          {isUploading ? "Uploading..." : "Upload Document"}
          <input
            type="file"
            accept=".pdf,.docx,.txt,.csv"
            onChange={handleUpload}
            className="hidden"
            disabled={isUploading}
          />
        </label>
      </div>
    </div>
  );
}