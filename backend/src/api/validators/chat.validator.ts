import { z } from 'zod';

/**
 * Zod schemas for chat-related request validation
 */

export const chatSchema = z.object({
  body: z.object({
    query: z.string().min(1, 'Query is required').max(5000, 'Query is too long'),
    limit: z.number().min(1).max(50).optional().default(5),
    threshold: z.number().min(0).max(1).optional().default(0.5),
    documentIds: z.array(z.string().uuid()).optional(),
  }),
});

export const summarizeDocumentSchema = z.object({
  params: z.object({
    documentId: z.string().uuid('Invalid document ID format'),
  }),
});

export type ChatRequest = z.infer<typeof chatSchema>;
export type SummarizeDocumentRequest = z.infer<typeof summarizeDocumentSchema>;
