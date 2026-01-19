import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkUploadLimit, getRemainingUploads } from '../../../src/core/services/uploadLimit.service';
import { createMockSupabaseClient, createMockQueryBuilder } from '../../mocks/supabase.mock';
import { TEST_USER_ID } from '../../mocks/fixtures';

// Mock the logger
vi.mock('../../../src/shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Upload Limit Service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  describe('checkUploadLimit', () => {
    it('should allow upload when under limit', async () => {
      const queryBuilder = createMockQueryBuilder(null, null);
      // Mock the select().eq().gte() chain to return count
      queryBuilder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: null, error: null, count: 2 }),
        }),
      });
      mockSupabase.from.mockReturnValue(queryBuilder);

      const result = await checkUploadLimit(mockSupabase, TEST_USER_ID);

      expect(result.allowed).toBe(true);
      expect(result.count).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.resetDate).toBeInstanceOf(Date);
    });

    it('should deny upload when at limit', async () => {
      const queryBuilder = createMockQueryBuilder(null, null);
      queryBuilder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: null, error: null, count: 5 }),
        }),
      });
      mockSupabase.from.mockReturnValue(queryBuilder);

      const result = await checkUploadLimit(mockSupabase, TEST_USER_ID);

      expect(result.allowed).toBe(false);
      expect(result.count).toBe(5);
    });

    it('should deny upload when over limit', async () => {
      const queryBuilder = createMockQueryBuilder(null, null);
      queryBuilder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: null, error: null, count: 10 }),
        }),
      });
      mockSupabase.from.mockReturnValue(queryBuilder);

      const result = await checkUploadLimit(mockSupabase, TEST_USER_ID);

      expect(result.allowed).toBe(false);
      expect(result.count).toBe(10);
    });

    it('should throw error when database query fails', async () => {
      const queryBuilder = createMockQueryBuilder(null, null);
      queryBuilder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
            count: null
          }),
        }),
      });
      mockSupabase.from.mockReturnValue(queryBuilder);

      await expect(checkUploadLimit(mockSupabase, TEST_USER_ID))
        .rejects.toThrow('Failed to check upload limit');
    });

    it('should allow upload when count is 0', async () => {
      const queryBuilder = createMockQueryBuilder(null, null);
      queryBuilder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
        }),
      });
      mockSupabase.from.mockReturnValue(queryBuilder);

      const result = await checkUploadLimit(mockSupabase, TEST_USER_ID);

      expect(result.allowed).toBe(true);
      expect(result.count).toBe(0);
    });

    it('should handle null count as 0', async () => {
      const queryBuilder = createMockQueryBuilder(null, null);
      queryBuilder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: null, error: null, count: null }),
        }),
      });
      mockSupabase.from.mockReturnValue(queryBuilder);

      const result = await checkUploadLimit(mockSupabase, TEST_USER_ID);

      expect(result.allowed).toBe(true);
      expect(result.count).toBe(0);
    });

    it('should return reset date in the future', async () => {
      const queryBuilder = createMockQueryBuilder(null, null);
      queryBuilder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
        }),
      });
      mockSupabase.from.mockReturnValue(queryBuilder);

      const result = await checkUploadLimit(mockSupabase, TEST_USER_ID);

      expect(result.resetDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('should query documents table with correct filters', async () => {
      const queryBuilder = createMockQueryBuilder(null, null);
      const gteMock = vi.fn().mockResolvedValue({ data: null, error: null, count: 0 });
      const eqMock = vi.fn().mockReturnValue({ gte: gteMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      queryBuilder.select = selectMock;
      mockSupabase.from.mockReturnValue(queryBuilder);

      await checkUploadLimit(mockSupabase, TEST_USER_ID);

      expect(mockSupabase.from).toHaveBeenCalledWith('documents');
      expect(selectMock).toHaveBeenCalledWith('id', { count: 'exact', head: true });
      expect(eqMock).toHaveBeenCalledWith('user_id', TEST_USER_ID);
    });
  });

  describe('getRemainingUploads', () => {
    it('should return correct remaining uploads', async () => {
      const queryBuilder = createMockQueryBuilder(null, null);
      queryBuilder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: null, error: null, count: 2 }),
        }),
      });
      mockSupabase.from.mockReturnValue(queryBuilder);

      const result = await getRemainingUploads(mockSupabase, TEST_USER_ID);

      expect(result.remaining).toBe(3); // 5 - 2 = 3
      expect(result.total).toBe(5);
      expect(result.used).toBe(2);
    });

    it('should return 0 remaining when at limit', async () => {
      const queryBuilder = createMockQueryBuilder(null, null);
      queryBuilder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: null, error: null, count: 5 }),
        }),
      });
      mockSupabase.from.mockReturnValue(queryBuilder);

      const result = await getRemainingUploads(mockSupabase, TEST_USER_ID);

      expect(result.remaining).toBe(0);
      expect(result.total).toBe(5);
      expect(result.used).toBe(5);
    });

    it('should return 0 remaining when over limit', async () => {
      const queryBuilder = createMockQueryBuilder(null, null);
      queryBuilder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: null, error: null, count: 10 }),
        }),
      });
      mockSupabase.from.mockReturnValue(queryBuilder);

      const result = await getRemainingUploads(mockSupabase, TEST_USER_ID);

      expect(result.remaining).toBe(0); // Math.max(0, 5 - 10) = 0
      expect(result.used).toBe(10);
    });

    it('should return all uploads when count is 0', async () => {
      const queryBuilder = createMockQueryBuilder(null, null);
      queryBuilder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
        }),
      });
      mockSupabase.from.mockReturnValue(queryBuilder);

      const result = await getRemainingUploads(mockSupabase, TEST_USER_ID);

      expect(result.remaining).toBe(5);
      expect(result.total).toBe(5);
      expect(result.used).toBe(0);
    });

    it('should include reset date', async () => {
      const queryBuilder = createMockQueryBuilder(null, null);
      queryBuilder.select = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
        }),
      });
      mockSupabase.from.mockReturnValue(queryBuilder);

      const result = await getRemainingUploads(mockSupabase, TEST_USER_ID);

      expect(result.resetDate).toBeInstanceOf(Date);
    });
  });
});
