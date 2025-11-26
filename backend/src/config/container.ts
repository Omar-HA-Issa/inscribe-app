import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';

// Repositories
import {
  DocumentRepository,
  ChunkRepository,
  MessageRepository,
  InsightRepository,
} from '../core/repositories';

// Services
import {
  DocumentService,
  SearchService,
  ChatService,
} from '../core/services';

// Infrastructure
import { OpenAIEmbeddingService, OpenAILLMService } from '../infrastructure/ai';

// Controllers
import { DocumentController, ChatController } from '../api/controllers';

/**
 * Dependency Injection Container
 * Manages service initialization and provides singleton instances
 *
 * Usage:
 *   const documentService = container.getDocumentService();
 *   const documentController = container.getDocumentController();
 */
export class DIContainer {
  private static instance: DIContainer;

  // Repositories
  private documentRepository!: DocumentRepository;
  private chunkRepository!: ChunkRepository;
  private messageRepository!: MessageRepository;
  private insightRepository!: InsightRepository;

  // Infrastructure Services
  private embeddingService!: OpenAIEmbeddingService;
  private llmService!: OpenAILLMService;

  // Core Services
  private documentService!: DocumentService;
  private searchService!: SearchService;
  private chatService!: ChatService;

  // Controllers
  private documentController!: DocumentController;
  private chatController!: ChatController;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Initialize the container with dependencies
   */
  static initialize(supabaseClient: SupabaseClient, openaiClient: OpenAI): void {
    const instance = DIContainer.getInstance();

    // Initialize repositories
    instance.documentRepository = new DocumentRepository(supabaseClient);
    instance.chunkRepository = new ChunkRepository(supabaseClient);
    instance.messageRepository = new MessageRepository(supabaseClient);
    instance.insightRepository = new InsightRepository(supabaseClient);

    // Initialize infrastructure services
    instance.embeddingService = new OpenAIEmbeddingService(openaiClient);
    instance.llmService = new OpenAILLMService(openaiClient);

    // Initialize core services
    instance.documentService = new DocumentService(
      instance.documentRepository,
      instance.chunkRepository,
      instance.embeddingService
    );

    instance.searchService = new SearchService(
      instance.chunkRepository,
      instance.embeddingService
    );

    instance.chatService = new ChatService(
      instance.chunkRepository,
      instance.embeddingService,
      instance.llmService
    );

    // Initialize controllers
    instance.documentController = new DocumentController(instance.documentService);
    instance.chatController = new ChatController(instance.chatService);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  // Getters for repositories
  getDocumentRepository(): DocumentRepository {
    return this.documentRepository;
  }

  getChunkRepository(): ChunkRepository {
    return this.chunkRepository;
  }

  getMessageRepository(): MessageRepository {
    return this.messageRepository;
  }

  getInsightRepository(): InsightRepository {
    return this.insightRepository;
  }

  // Getters for infrastructure services
  getEmbeddingService(): OpenAIEmbeddingService {
    return this.embeddingService;
  }

  getLLMService(): OpenAILLMService {
    return this.llmService;
  }

  // Getters for core services
  getDocumentService(): DocumentService {
    return this.documentService;
  }

  getSearchService(): SearchService {
    return this.searchService;
  }

  getChatService(): ChatService {
    return this.chatService;
  }

  // Getters for controllers
  getDocumentController(): DocumentController {
    return this.documentController;
  }

  getChatController(): ChatController {
    return this.chatController;
  }
}

/**
 * Factory function for easy access
 * Usage: const container = getContainer();
 */
export function getContainer(): DIContainer {
  return DIContainer.getInstance();
}
