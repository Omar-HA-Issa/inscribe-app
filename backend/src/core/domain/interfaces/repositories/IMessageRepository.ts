import { Message, CreateMessageDTO } from '../../entities/Message';

/**
 * Repository interface for Message data access
 * Defines contract for all message database operations
 */
export interface IMessageRepository {
  /**
   * Find a message by ID
   */
  findById(id: string): Promise<Message | null>;

  /**
   * Find all messages for a conversation
   */
  findByConversationId(conversationId: string, limit?: number, offset?: number): Promise<Message[]>;

  /**
   * Create a message
   */
  create(data: CreateMessageDTO): Promise<Message>;

  /**
   * Delete a message
   */
  delete(id: string): Promise<void>;

  /**
   * Count messages in a conversation
   */
  countByConversationId(conversationId: string): Promise<number>;
}
