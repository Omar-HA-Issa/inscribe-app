const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// =====================
// Token Management
// =====================

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem("access_token");
  } catch {
    return null;
  }
}

export function setAuthTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
}

export function clearAuthTokens(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

// =====================
// Auth Response Types
// =====================

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

// =====================
// Authentication APIs
// =====================

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

  if (data.session) {
    setAuthTokens(data.session.access_token, data.session.refresh_token);
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

  if (data.session) {
    setAuthTokens(data.session.access_token, data.session.refresh_token);
  }

  return data;
}

/** POST /api/logout - Sign out current user */
export async function signOut(): Promise<void> {
  await fetch(`${API_URL}/api/logout`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  clearAuthTokens();
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

/** POST /api/reset-password - Reset password with token */
export async function resetPassword(accessToken: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/api/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ password: newPassword }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to reset password");
  }

  return res.json();
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
    headers: headers, // Let browser set Content-Type for FormData
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

// =====================
// Generic API Client (for other endpoints)
// =====================

interface RequestOptions extends RequestInit {
  body?: any;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = getAuthToken();

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return {} as T;
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Not authenticated');
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_URL);
export { API_URL };