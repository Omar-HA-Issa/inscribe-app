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
      <div className="w-16 bg-[#0e0e0e] flex flex-col items-center h-[calc(100vh-6rem)] py-4 gap-4 transition-all duration-300">
        {/* Expand Button */}
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          title="Expand sidebar"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Selected Count Indicator */}
        {selectedDocs.length > 0 && (
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span className="text-xs font-medium text-purple-400">{selectedDocs.length}</span>
          </div>
        )}

        {/* Upload Button (Collapsed) */}
        <label className="mt-auto p-2 rounded-lg hover:bg-purple-500/20 transition-colors cursor-pointer text-purple-400 hover:text-purple-300">
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
    <div className="w-72 bg-[#0e0e0e] flex flex-col h-[calc(100vh-6rem)] transition-all duration-300">
      <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-300">
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-lg font-semibold">Documents</h2>
            <div className="flex items-center gap-2">
              {selectedDocs.length > 0 && (
                <div className="px-2 py-1 rounded-full bg-purple-500/20 text-xs font-medium text-purple-400">
                  {selectedDocs.length}
                </div>
              )}
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-900/50 rounded-lg
                text-white text-sm placeholder-gray-500
                focus:outline-none focus:ring-1 focus:ring-purple-500/50
                transition-all"
            />
          </div>

          {/* Quick Actions */}
          {documents.length > 0 && (
            <div className="flex gap-2 text-xs">
              <button
                onClick={selectAll}
                className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
              >
                Select All
              </button>
              <span className="text-gray-700">•</span>
              <button
                onClick={clearAll}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                {searchQuery ? "No matches" : "No documents yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredDocuments.map((doc) => {
                const isSelected = selectedDocs.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDocument(doc.id)}
                    className={`
                      group relative p-3 rounded-lg cursor-pointer transition-all duration-200
                      ${isSelected 
                        ? 'bg-purple-500/10 ring-1 ring-purple-500/30' 
                        : 'hover:bg-gray-900/50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="mt-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                        )}
                      </div>

                      {/* Document Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate font-medium ${
                          isSelected ? 'text-white' : 'text-gray-300'
                        }`}>
                          {doc.file_name}
                        </p>
                        <p className="text-gray-600 text-xs mt-0.5">
                          {new Date(doc.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => deleteDocument(doc.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" />
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
      <div className="p-4">
        <label className="flex items-center justify-center gap-2 px-4 py-2.5
          rounded-lg cursor-pointer text-sm font-medium
          bg-gradient-to-r from-purple-500 to-purple-600
          hover:from-purple-600 hover:to-purple-700
          text-white transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20">
          <Upload className="w-4 h-4" />
          {isUploading ? "Uploading..." : "Upload"}
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