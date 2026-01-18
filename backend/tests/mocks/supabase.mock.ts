import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Type for the chainable query builder
interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
}

// Create a chainable mock query builder
export function createMockQueryBuilder(
  resolveData: any = null,
  resolveError: any = null
): MockQueryBuilder {
  const builder: any = {};

  const chainMethods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'in', 'is', 'order', 'limit', 'range'
  ];

  chainMethods.forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  // Terminal methods that return promises
  builder.single = vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });
  builder.maybeSingle = vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });

  // Make the builder itself thenable
  builder.then = (resolve: any) => {
    return Promise.resolve({ data: resolveData, error: resolveError }).then(resolve);
  };

  return builder;
}

// Create mock auth object
export function createMockAuth(overrides: Record<string, any> = {}) {
  return {
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: { id: '123e4567-e89b-12d3-a456-426614174000' }, session: { access_token: 'test-token' } },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: { id: '123e4567-e89b-12d3-a456-426614174000' }, session: null },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: '123e4567-e89b-12d3-a456-426614174000', email: 'test@example.com' } },
      error: null,
    }),
    getSession: vi.fn().mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    }),
    ...overrides,
  };
}

// Create mock RPC function
export function createMockRpc(resolveData: any = [], resolveError: any = null) {
  return vi.fn().mockResolvedValue({ data: resolveData, error: resolveError });
}

// Create a full mock Supabase client
export function createMockSupabaseClient(config: {
  queryData?: any;
  queryError?: any;
  authOverrides?: Record<string, any>;
  rpcData?: any;
  rpcError?: any;
} = {}): SupabaseClient {
  const {
    queryData = null,
    queryError = null,
    authOverrides = {},
    rpcData = [],
    rpcError = null,
  } = config;

  const queryBuilder = createMockQueryBuilder(queryData, queryError);

  const client = {
    from: vi.fn().mockReturnValue(queryBuilder),
    auth: createMockAuth(authOverrides),
    rpc: createMockRpc(rpcData, rpcError),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/file' } }),
      }),
    },
  };

  return client as unknown as SupabaseClient;
}

// Mock the supabase client module
export function mockSupabaseModule() {
  const mockClient = createMockSupabaseClient();

  vi.mock('../../src/core/clients/supabaseClient', () => ({
    adminClient: vi.fn(() => mockClient),
    anonServerClient: vi.fn(() => mockClient),
    userClient: vi.fn(() => mockClient),
    clientFromRequest: vi.fn(() => mockClient),
    extractBearerToken: vi.fn((req) => req.headers?.authorization?.replace('Bearer ', '') || null),
    extractCookieToken: vi.fn(() => null),
  }));

  return mockClient;
}

// Helper to setup query builder with specific responses for different tables
export function setupMockQueries(client: any, tableResponses: Record<string, { data?: any; error?: any }>) {
  client.from.mockImplementation((table: string) => {
    const response = tableResponses[table] || { data: null, error: null };
    return createMockQueryBuilder(response.data, response.error);
  });
}

// Helper to setup RPC responses
export function setupMockRpc(client: any, rpcResponses: Record<string, { data?: any; error?: any }>) {
  client.rpc.mockImplementation((functionName: string) => {
    const response = rpcResponses[functionName] || { data: [], error: null };
    return Promise.resolve(response);
  });
}
