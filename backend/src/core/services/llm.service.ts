import OpenAI from 'openai';
import { logger } from '../../shared/utils/logger';

// Singleton OpenAI instance
let openaiInstance: OpenAI | null = null;

/**
 * Get the shared OpenAI client instance.
 * This ensures a single OpenAI client is used across all services.
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OPENAI_API_KEY is not set');
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    logger.info('OpenAI client initialized');
  }

  return openaiInstance;
}

/**
 * Model configurations for different use cases.
 * Centralizes model selection to make it easy to update.
 */
export const LLM_MODELS = {
  // For quick, cost-effective tasks
  FAST: 'gpt-4o-mini',
  // For complex analysis tasks
  ADVANCED: 'gpt-4o',
} as const;

export type LLMModel = typeof LLM_MODELS[keyof typeof LLM_MODELS];

/**
 * Common parameters for chat completions.
 */
export interface ChatCompletionParams {
  model?: LLMModel;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

/**
 * Create a chat completion with standardized error handling.
 */
export async function createChatCompletion(params: ChatCompletionParams): Promise<string> {
  const openai = getOpenAIClient();

  const {
    model = LLM_MODELS.ADVANCED,
    messages,
    temperature = 0.3,
    maxTokens = 2000,
    responseFormat = 'text',
  } = params;

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(responseFormat === 'json' && { response_format: { type: 'json_object' as const } }),
    });

    const content = completion.choices[0].message.content;

    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    return content;
  } catch (error) {
    logger.error('OpenAI API error:', { error });
    throw error;
  }
}

/**
 * Create a JSON chat completion with automatic parsing.
 */
export async function createJsonCompletion<T>(params: Omit<ChatCompletionParams, 'responseFormat'>): Promise<T> {
  const content = await createChatCompletion({
    ...params,
    responseFormat: 'json',
  });

  try {
    return JSON.parse(content) as T;
  } catch (error) {
    logger.error('Failed to parse JSON response:', { error, content });
    throw new Error('Invalid JSON response from OpenAI');
  }
}
