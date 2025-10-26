const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface UploadResponse {
  success: boolean;
  message: string;
  document?: {
    id: string;
    filename: string;
    file_size: string;
    file_type: string;
  };
  error?: string;
}

export interface Document {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: string;
  created_at: string;
}

export interface DocumentsResponse {
  success: boolean;
  documents?: Document[];
  message?: string;
  error?: string;
}

/**
 * Upload a document to the backend
 */
export const uploadDocument = async (file: File): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Upload failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Get all uploaded documents
 */
export const getDocuments = async (): Promise<DocumentsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch documents');
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch documents error:', error);
    throw error;
  }
};

/**
 * Delete a document by ID
 */
export const deleteDocument = async (documentId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete document');
    }

    return await response.json();
  } catch (error) {
    console.error('Delete document error:', error);
    throw error;
  }
};

/**
 * Check backend health
 */
export const checkHealth = async (): Promise<{ status: string; message: string; timestamp: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    return await response.json();
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
};