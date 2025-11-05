const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface AuthResponse {
  user?: {
    id: string;
    email: string;
    [key: string]: any;
  };
  session?: {
    access_token: string;
    refresh_token: string;
  };
  needs_email_confirm?: boolean;
  error?: string;
}

/** POST /api/signup - Register new user */
export async function signUp(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    let msg = "Signup failed";
    try {
      const j = await res.json();
      msg = j.error || j.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }

  const data = await res.json();

  // ✅ Store tokens in localStorage
  if (data.session) {
    localStorage.setItem("access_token", data.session.access_token);
    localStorage.setItem("refresh_token", data.session.refresh_token);
  }

  return data;
}

/** POST /api/login - Sign in existing user */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    let msg = "Login failed";
    try {
      const j = await res.json();
      msg = j.error || j.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }

  const data = await res.json();

  // ✅ Store tokens in localStorage
  if (data.session) {
    localStorage.setItem("access_token", data.session.access_token);
    localStorage.setItem("refresh_token", data.session.refresh_token);
  }

  return data;
}

/** POST /api/logout - Sign out current user */
export async function signOut(): Promise<void> {
  await fetch(`${API_URL}/api/logout`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  // ✅ Clear tokens from localStorage
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

/** GET /api/me - Get current user info */
export async function getCurrentUser(): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/me`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Not authenticated");
  }

  return res.json();
}

/** POST /api/forgot-password - Request password reset */
export async function resetPasswordRequest(email: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/api/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to send reset email");
  }

  return res.json();
}

// =====================
// Helper Functions
// =====================

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

export function getAuthToken(): string | null {
  return localStorage.getItem("access_token");
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

// =====================
// Document APIs (Protected)
// =====================

/** GET /api/documents - Fetch user's documents */
export async function fetchUserDocuments() {
  const res = await fetch(`${API_URL}/api/documents`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    if (res.status === 401) {
      await signOut();
      throw new Error("Session expired. Please login again.");
    }
    throw new Error("Failed to fetch documents");
  }

  return res.json();
}

/** POST /api/upload - Upload a document */
export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const token = getAuthToken();
  const headers: HeadersInit = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: headers, // ✅ Only Authorization header, let browser set Content-Type for FormData
    body: formData,
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Not authenticated");
    }
    const error = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error.error || error.message || "Upload failed");
  }

  return res.json();
}

/** POST /api/chat - Send a chat query */
export async function sendChatQuery(query: string, limit: number = 5) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ question: query, topK: limit }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      await signOut();
      throw new Error("Session expired. Please login again.");
    }
    throw new Error("Chat query failed");
  }

  return res.json();
}

/** POST /api/search - Search documents */
export async function searchDocuments(query: string, topK: number = 8, minSimilarity: number = 0.2) {
  const res = await fetch(`${API_URL}/api/search`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ query, topK, minSimilarity }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      await signOut();
      throw new Error("Session expired. Please login again.");
    }
    throw new Error("Search failed");
  }

  return res.json();
}