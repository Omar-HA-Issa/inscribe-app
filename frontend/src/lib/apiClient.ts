const API_URL = import.meta.env.VITE_API_URL;

/** Upload one document (multipart/form-data) */
export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let msg = "Upload failed";
    try {
      const j = await res.json();
      msg = j.error || j.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json(); // { success, document:{id, filename,...}, chunksCreated, ... }
}

/** GET /documents - list user’s documents (RLS enforced on backend) */
export async function fetchUserDocuments() {
  const res = await fetch(`${API_URL}/documents`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch documents");
  const json = await res.json();
  return json.documents || [];
}

/** POST /chat - ask about selected docs */
export async function sendChatQuery(query: string, selectedDocumentIds: string[] = []) {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, selectedDocumentIds }),
  });
  if (!res.ok) throw new Error("Chat failed");
  return res.json(); // { answer, sources, ... }
}

/** POST /chat/summarize/:id - summarize a single doc */
export async function summarizeDocument(documentId: string) {
  const res = await fetch(`${API_URL}/chat/summarize/${documentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Summarize failed");
  return res.json();
}
