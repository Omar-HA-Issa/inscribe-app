import { vi } from 'vitest';

// Test UUIDs
export const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
export const TEST_USER_ID_2 = '223e4567-e89b-12d3-a456-426614174001';
export const TEST_DOCUMENT_ID = '456e4567-e89b-12d3-a456-426614174001';
export const TEST_DOCUMENT_ID_2 = '556e4567-e89b-12d3-a456-426614174002';
export const TEST_CHUNK_ID = '789e4567-e89b-12d3-a456-426614174002';
export const INVALID_UUID = 'not-a-valid-uuid';

// Test user data
export const TEST_USER = {
  id: TEST_USER_ID,
  email: 'test@example.com',
  password: 'password123',
  created_at: new Date().toISOString(),
};

// Test JWT token (fake but properly formatted)
export const TEST_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiaXNzIjoiaHR0cHM6Ly90ZXN0LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTgwMDAwMDAwMH0.test';

// Test document data
export const TEST_DOCUMENT = {
  id: TEST_DOCUMENT_ID,
  user_id: TEST_USER_ID,
  file_name: 'test-document.pdf',
  file_type: 'application/pdf',
  file_size: 1024 * 100, // 100KB
  file_hash: 'abc123def456',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const TEST_DOCUMENT_DB_ROW = {
  ...TEST_DOCUMENT,
  summary: null,
  metadata: null,
};

// Test chunk data
export const TEST_CHUNK = {
  id: TEST_CHUNK_ID,
  document_id: TEST_DOCUMENT_ID,
  chunk_index: 0,
  content: 'This is test content from a technical document about software architecture.',
  embedding: Array(1536).fill(0.1), // OpenAI embedding dimension
  token_count: 15,
  created_at: new Date().toISOString(),
};

export const TEST_CHUNKS = [
  TEST_CHUNK,
  {
    ...TEST_CHUNK,
    id: '789e4567-e89b-12d3-a456-426614174003',
    chunk_index: 1,
    content: 'Additional content about API design patterns and best practices.',
  },
  {
    ...TEST_CHUNK,
    id: '789e4567-e89b-12d3-a456-426614174004',
    chunk_index: 2,
    content: 'More content about database schemas and data modeling techniques.',
  },
];

// Test search result
export const TEST_SEARCH_RESULT = {
  id: TEST_CHUNK_ID,
  document_id: TEST_DOCUMENT_ID,
  content: TEST_CHUNK.content,
  similarity: 0.85,
  metadata: {},
};

// Test file data
export const TEST_PDF_BUFFER = Buffer.from('fake pdf content');
export const TEST_TXT_CONTENT = `
This is a technical document about software engineering.
It covers topics like system design, API architecture, and best practices.
The document includes detailed specifications and implementation guidelines.
`;

export const TEST_FILE_UPLOAD = {
  fieldname: 'file',
  originalname: 'test-document.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  buffer: TEST_PDF_BUFFER,
  size: TEST_PDF_BUFFER.length,
};

// Test insights data
export const TEST_INSIGHTS = {
  document_id: TEST_DOCUMENT_ID,
  insights: [
    {
      title: 'Key Architecture Decision',
      description: 'The system uses microservices architecture for scalability.',
      confidence: 0.9,
      impact: 'high',
    },
    {
      title: 'Performance Consideration',
      description: 'Caching is implemented at multiple layers.',
      confidence: 0.85,
      impact: 'medium',
    },
  ],
  created_at: new Date().toISOString(),
};

// Test summary data
export const TEST_SUMMARY = {
  overview: 'This document describes a software architecture for a scalable web application.',
  keyFindings: [
    'Microservices architecture is recommended',
    'API gateway pattern for routing',
    'Event-driven communication between services',
  ],
  keywords: ['microservices', 'API', 'scalability', 'architecture'],
  wordCount: 1500,
  pageCount: 5,
  readingTime: 6,
};

// Test validation result
export const TEST_VALIDATION_RESULT = {
  isValid: true,
  documentType: 'technical',
  confidence: 0.95,
  reasons: ['Contains technical terminology', 'Has structured format'],
};

// Test chat message
export const TEST_CHAT_REQUEST = {
  question: 'What is the main architecture pattern used?',
  topK: 5,
  similarityThreshold: 0.5,
  selectedDocumentIds: [TEST_DOCUMENT_ID],
};

export const TEST_CHAT_RESPONSE = {
  answer: 'The document describes a microservices architecture pattern.',
  sources: [
    {
      documentId: TEST_DOCUMENT_ID,
      chunkId: TEST_CHUNK_ID,
      content: TEST_CHUNK.content,
      similarity: 0.85,
    },
  ],
};

// Test embedding
export const TEST_EMBEDDING = Array(1536).fill(0).map((_, i) => Math.sin(i) * 0.1);

// Helper to create mock Express request
export function createMockRequest(overrides: Record<string, any> = {}) {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    cookies: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  };
}

// Helper to create mock Express response
export function createMockResponse() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    sendSuccess: vi.fn().mockReturnThis(),
    sendError: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return res;
}

// Helper to create mock next function
export function createMockNext() {
  return vi.fn();
}
