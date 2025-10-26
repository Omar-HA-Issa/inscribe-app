export interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  content: string;
  storage_path: string;
  upload_date: string;
  user_id?: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  embedding?: number[];
  created_at: string;
}

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
