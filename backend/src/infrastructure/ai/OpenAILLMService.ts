import OpenAI from 'openai';
import { ILLMService, ChatMessage, ChatOptions } from '../../core/domain/interfaces/services';
import { LLM_CONFIG } from '../../shared/constants/config';

/**
 * OpenAI implementation of ILLMService
 * Provides chat completion and structured output capabilities
 */
export class OpenAILLMService implements ILLMService {
  constructor(private openaiClient: OpenAI) {}

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const response = await this.openaiClient.chat.completions.create({
      model: options?.model || LLM_CONFIG.CHAT_MODEL,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options?.temperature !== undefined ? options.temperature : LLM_CONFIG.CHAT_TEMPERATURE,
      max_tokens: options?.maxTokens || LLM_CONFIG.CHAT_MAX_TOKENS,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return content;
  }

  async chatJson<T>(
    messages: ChatMessage[],
    _jsonSchema?: Record<string, unknown>,
    options?: ChatOptions
  ): Promise<T> {
    // For GPT-4o, we use response_format with type: json_object
    const model = options?.model || LLM_CONFIG.ANALYSIS_MODEL;

    const response = await this.openaiClient.chat.completions.create({
      model: model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options?.temperature !== undefined ? options.temperature : LLM_CONFIG.ANALYSIS_TEMPERATURE,
      max_tokens: options?.maxTokens || LLM_CONFIG.ANALYSIS_MAX_TOKENS,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    try {
      return JSON.parse(content) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON response from OpenAI: ${error}`);
    }
  }
}
