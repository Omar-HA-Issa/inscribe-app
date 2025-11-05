import { useState, useEffect } from "react";
import { uploadDocument, fetchUserDocuments } from "../../lib/apiClient";
import { Search, CheckSquare, Square, Trash2 } from "lucide-react";

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
    e.stopPropagation(); // Don't trigger selection

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
        // Remove from selected docs if it was selected
        setSelectedDocs(selectedDocs.filter(id => id !== docId));
        // Reload documents list
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

  // Filter documents based on search query
  const filteredDocuments = documents.filter((doc) =>
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-64 bg-[#0e0e0e] border-r border-gray-800 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white text-lg font-semibold">Your Documents</h2>
            <div className="text-xs text-gray-400">
              {selectedDocs.length > 0 && `${selectedDocs.length} selected`}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg
                text-white text-sm placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                transition-all"
            />
          </div>

          {/* Select All / Clear All */}
          {documents.length > 0 && (
            <div className="flex gap-2 text-xs">
              <button
                onClick={selectAll}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                Select All
              </button>
              <span className="text-gray-600">|</span>
              <button
                onClick={clearAll}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : filteredDocuments.length === 0 ? (
            <p className="text-gray-400 text-sm">
              {searchQuery ? "No documents found." : "No documents yet. Upload one below!"}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredDocuments.map((doc) => {
                const isSelected = selectedDocs.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDocument(doc.id)}
                    className={`
                      p-3 rounded-lg cursor-pointer transition-all duration-200
                      border
                      ${isSelected 
                        ? 'bg-purple-900/30 border-purple-500/50 shadow-lg shadow-purple-500/10' 
                        : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-start gap-2">
                      {/* Checkbox */}
                      <div className="mt-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-500" />
                        )}
                      </div>

                      {/* Document Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate font-medium ${
                          isSelected ? 'text-white' : 'text-gray-200'
                        }`}>
                          {doc.file_name}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => deleteDocument(doc.id, e)}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors group"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4 text-gray-500 group-hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload Button (Fixed at Bottom) */}
      <div className="p-4 border-t border-gray-800">
        <label
          className="flex items-center justify-center px-3 py-2
            rounded-lg cursor-pointer text-sm font-medium
            bg-gradient-to-r from-[#a855f7] to-[#8b5cf6]
            hover:from-[#9333ea] hover:to-[#7e22ce]
            text-white transition-all duration-200 shadow-md
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
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