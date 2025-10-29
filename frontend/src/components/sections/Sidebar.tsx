import { useState } from "react";
import { uploadDocument } from "../../lib/apiClient";

type SidebarProps = {
  selectedDocs: string[];
  setSelectedDocs: (docs: string[]) => void;
};

export function Sidebar({ selectedDocs, setSelectedDocs }: { selectedDocs: string[], setSelectedDocs: (docs: string[]) => void }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadDocument(file);
      // re-fetch docs if needed
      const res = await fetch("/api/documents", { credentials: "include" });
      const data = await res.json();
      setSelectedDocs(data.documents || []);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-64 bg-[#0e0e0e] border-r border-gray-800 flex flex-col justify-between h-[calc(100vh-6rem)]">
      <div className="p-4">
        <h2 className="text-white text-lg font-semibold mb-3">Your Documents</h2>
        <div className="space-y-2">
          {/* render document list here */}
        </div>
      </div>

      <div className="p-4 border-t border-gray-800">
          <label
              className="flex items-center justify-center px-3 py-2
  rounded-lg cursor-pointer text-sm font-medium
  bg-gradient-to-r from-[#a855f7] to-[#8b5cf6]
  hover:from-[#9333ea] hover:to-[#7e22ce]
  text-white transition-all duration-200 shadow-md"
          >
              {isUploading ? "Uploading..." : "Upload Document"}
              <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleUpload}
                  className="hidden"
              />
          </label>
      </div>
    </div>
  );
}
