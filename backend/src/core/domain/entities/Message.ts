/**
 * Message entity representing a message in a conversation
 */
export class Message {
  constructor(
    public id: string,
    public conversationId: string,
    public userId: string,
    public content: string,
    public role: MessageRole,
    public createdAt: Date,
    public metadata: MessageMetadata | null = null
  ) {}

  /**
   * Check if message is from user
   */
  isFromUser(): boolean {
    return this.role === 'user';
  }

  /**
   * Check if message is from assistant
   */
  isFromAssistant(): boolean {
    return this.role === 'assistant';
  }

  /**
   * Convert to DTO for API responses
   */
  toDTO() {
    return {
      id: this.id,
      conversationId: this.conversationId,
      userId: this.userId,
      content: this.content,
      role: this.role,
      createdAt: this.createdAt.toISOString(),
      metadata: this.metadata,
    };
  }
}

export type MessageRole = 'user' | 'assistant';

export interface MessageMetadata {
  sources?: Array<{
    chunkId: string;
    documentId: string;
    similarity: number;
    content: string;
  }>;
  [key: string]: unknown;
}

/**
 * DTO for creating a message
 */
export interface CreateMessageDTO {
  conversationId: string;
  userId: string;
  content: string;
  role: MessageRole;
  metadata?: MessageMetadata;
}
