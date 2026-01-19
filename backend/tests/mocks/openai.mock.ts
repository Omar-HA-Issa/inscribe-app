import { vi } from 'vitest';
import { TEST_EMBEDDING } from './fixtures';

// Mock embedding response
export const MOCK_EMBEDDING_RESPONSE = {
  data: [
    {
      embedding: TEST_EMBEDDING,
      index: 0,
      object: 'embedding',
    },
  ],
  model: 'text-embedding-3-small',
  object: 'list',
  usage: {
    prompt_tokens: 10,
    total_tokens: 10,
  },
};

// Mock chat completion response
export const MOCK_CHAT_COMPLETION = {
  id: 'chatcmpl-test123',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-4o-mini',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'This is a test response from the AI model.',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 50,
    completion_tokens: 20,
    total_tokens: 70,
  },
};

// Create mock OpenAI embeddings
export function createMockEmbeddings(count: number = 1) {
  return {
    data: Array(count).fill(null).map((_, i) => ({
      embedding: TEST_EMBEDDING.map((v, j) => v + i * 0.01 + j * 0.0001),
      index: i,
      object: 'embedding',
    })),
    model: 'text-embedding-3-small',
    object: 'list',
    usage: {
      prompt_tokens: count * 10,
      total_tokens: count * 10,
    },
  };
}

// Create mock OpenAI client
export function createMockOpenAIClient() {
  return {
    embeddings: {
      create: vi.fn().mockResolvedValue(MOCK_EMBEDDING_RESPONSE),
    },
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue(MOCK_CHAT_COMPLETION),
      },
    },
  };
}

// Mock the OpenAI module
export function mockOpenAIModule() {
  const mockClient = createMockOpenAIClient();

  vi.mock('openai', () => ({
    default: vi.fn(() => mockClient),
    OpenAI: vi.fn(() => mockClient),
  }));

  return mockClient;
}

// Mock fetch for direct OpenAI API calls (used in some services)
export function mockOpenAIFetch() {
  const originalFetch = global.fetch;

  global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
    // Check if it's an OpenAI API call
    if (typeof url === 'string' && url.includes('api.openai.com')) {
      const body = options?.body ? JSON.parse(options.body) : {};

      // Embeddings endpoint
      if (url.includes('/embeddings')) {
        const inputCount = Array.isArray(body.input) ? body.input.length : 1;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createMockEmbeddings(inputCount)),
        });
      }

      // Chat completions endpoint
      if (url.includes('/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(MOCK_CHAT_COMPLETION),
        });
      }
    }

    // Fall through to original fetch for other URLs
    return originalFetch(url, options);
  }) as typeof fetch;

  return () => {
    global.fetch = originalFetch;
  };
}

// Helper to create custom chat completion response
export function createMockChatCompletion(content: string) {
  return {
    ...MOCK_CHAT_COMPLETION,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: 'stop',
      },
    ],
  };
}

// Helper to create error response
export function createMockOpenAIError(message: string, status: number = 500) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({
      error: {
        message,
        type: 'api_error',
        code: status === 429 ? 'rate_limit_exceeded' : 'internal_error',
      },
    }),
  };
}
