/**
 * Service interface for LLM (Large Language Model) operations
 */
export interface ILLMService {
  /**
   * Generate a chat completion
   */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;

  /**
   * Generate a completion with JSON response format
   */
  chatJson<T>(
    messages: ChatMessage[],
    jsonSchema?: Record<string, unknown>,
    options?: ChatOptions
  ): Promise<T>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}
