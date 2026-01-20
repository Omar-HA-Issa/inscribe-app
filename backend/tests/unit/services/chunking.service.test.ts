import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChunkingService, TextChunk } from '../../../src/core/services/chunking.service';

// Mock the logger
vi.mock('../../../src/shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(() => {
    service = new ChunkingService();
  });

  describe('chunkText', () => {
    it('should return empty array for empty string', async () => {
      const result = await service.chunkText('');
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only string', async () => {
      const result = await service.chunkText('   \n\n   ');
      expect(result).toEqual([]);
    });

    it('should return empty array for null/undefined', async () => {
      const result = await service.chunkText(null as any);
      expect(result).toEqual([]);
    });

    it('should chunk short text into single chunk', async () => {
      const text = 'This is a short piece of text for testing.';
      const result = await service.chunkText(text);

      expect(result.length).toBe(1);
      expect(result[0].content).toBe(text);
      expect(result[0].chunkIndex).toBe(0);
      expect(result[0].tokenCount).toBeGreaterThan(0);
    });

    it('should assign sequential chunk indices', async () => {
      // Create text long enough to produce multiple chunks
      const text = `
        This is a technical document about software architecture.
        It discusses various design patterns and best practices.
        The document covers topics such as microservices, API design, and database modeling.
      `.repeat(50);

      const result = await service.chunkText(text);

      // Verify sequential indices
      result.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index);
      });
    });

    it('should include token count for each chunk', async () => {
      const text = 'This is a test document with some content for chunking.';
      const result = await service.chunkText(text);

      expect(result.length).toBeGreaterThan(0);
      result.forEach(chunk => {
        expect(chunk.tokenCount).toBeGreaterThan(0);
        expect(typeof chunk.tokenCount).toBe('number');
      });
    });

    it('should produce chunks with content', async () => {
      const text = 'Software engineering is the application of engineering principles to software development.';
      const result = await service.chunkText(text);

      expect(result.length).toBeGreaterThan(0);
      result.forEach(chunk => {
        expect(chunk.content).toBeTruthy();
        expect(chunk.content.trim().length).toBeGreaterThan(0);
      });
    });

    it('should handle text with special characters', async () => {
      const text = 'Testing special chars: @#$%^&*() and unicode: é à ü ñ 中文 日本語';
      const result = await service.chunkText(text);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].content).toContain('é');
      expect(result[0].content).toContain('中文');
    });

    it('should handle text with multiple paragraphs', async () => {
      const text = `
        First paragraph about software design.

        Second paragraph about API architecture.

        Third paragraph about testing strategies.
      `;
      const result = await service.chunkText(text);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should return chunks with TextChunk interface properties', async () => {
      const text = 'This is a test for interface compliance.';
      const result = await service.chunkText(text);

      expect(result.length).toBeGreaterThan(0);
      const chunk = result[0];

      expect(chunk).toHaveProperty('content');
      expect(chunk).toHaveProperty('chunkIndex');
      expect(chunk).toHaveProperty('tokenCount');
      expect(typeof chunk.content).toBe('string');
      expect(typeof chunk.chunkIndex).toBe('number');
      expect(typeof chunk.tokenCount).toBe('number');
    });
  });

  describe('chunking behavior', () => {
    it('should produce multiple chunks for long text', async () => {
      // Generate text that's definitely longer than chunk size
      const longText = `
        This is a comprehensive technical document about software architecture patterns.
        It covers microservices, event-driven architecture, and domain-driven design.
        The document provides detailed explanations and code examples.
        Each section builds upon the previous one to create a complete picture.
        Best practices and anti-patterns are discussed throughout.
      `.repeat(100);

      const result = await service.chunkText(longText);

      expect(result.length).toBeGreaterThan(1);
    });

    it('should preserve text content across chunks', async () => {
      const text = 'Important keyword: UNIQUE_MARKER_12345. This should appear in the chunks.';
      const result = await service.chunkText(text);

      const allContent = result.map(c => c.content).join(' ');
      expect(allContent).toContain('UNIQUE_MARKER_12345');
    });
  });
});
