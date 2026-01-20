// Core Services
export { ChatService } from './chat.service';
export type { ChatResponse, SummaryResponse, Chunk } from './chat.service';

export { SearchService } from './search.service';
export { ChunkingService } from './chunking.service';
export { FileParserService } from './fileParser.service';
export { generateDocumentSummary } from './summary.service';
export { generateDocumentInsights, generateCrossDocumentInsights } from './insights.service';
export type { Insight, InsightResponse, InsightCategory } from './insights.service';
export { detectWithinDocument, detectAcrossDocuments, validateDocumentIsTechnical, clearAnalysisCache } from './validation.service';
export { EmbeddingService } from './embedding.service';

// Helper Services
export { FileUploadService } from './fileUpload.service';
export { PromptService } from './prompts.service';
export { CacheService, analysisCache, summaryCache, insightsCache } from './cache.service';

// LLM Service
export { getOpenAIClient, LLM_MODELS } from './llm.service';
