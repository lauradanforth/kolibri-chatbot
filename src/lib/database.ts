import { sql } from '@vercel/postgres';
import { NextRequest } from 'next/server';

// Database service for chatbot logging
export class DatabaseService {
  // Initialize database tables
  static async initializeDatabase() {
    try {
      // Read and execute the schema file
      const schemaPath = new URL('./database-schema.sql', import.meta.url);
      const response = await fetch(schemaPath);
      const schema = await response.text();
      
      // Execute the schema
      await sql.query(schema);
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  // Create a new conversation
  static async createConversation(sessionId: string, userAgent?: string, ipAddress?: string) {
    try {
      const result = await sql`
        INSERT INTO conversations (session_id, user_agent, ip_address)
        VALUES (${sessionId}, ${userAgent || null}, ${ipAddress || null})
        RETURNING id
      `;
      
      return result.rows[0].id;
    } catch (error) {
      console.error('❌ Failed to create conversation:', error);
      throw error;
    }
  }

  // Log a message (user prompt or assistant response)
  static async logMessage(
    conversationId: number,
    role: 'user' | 'assistant' | 'system',
    content: string,
    tokensUsed?: number,
    modelUsed?: string
  ) {
    try {
      const result = await sql`
        INSERT INTO messages (conversation_id, role, content, tokens_used, model_used)
        VALUES (${conversationId}, ${role}, ${content}, ${tokensUsed || null}, ${modelUsed || null})
        RETURNING id
      `;
      
      return result.rows[0].id;
    } catch (error) {
      console.error('❌ Failed to log message:', error);
      throw error;
    }
  }

  // Log context usage (which documents were used)
  static async logContextUsage(
    messageId: number,
    documentName: string,
    documentSource: string,
    documentType: string,
    relevanceScore?: number,
    searchMethod?: string
  ) {
    try {
      await sql`
        INSERT INTO context_used (message_id, document_name, document_source, document_type, relevance_score, search_method)
        VALUES (${messageId}, ${documentName}, ${documentSource}, ${documentType}, ${relevanceScore || null}, ${searchMethod || null})
      `;
    } catch (error) {
      console.error('❌ Failed to log context usage:', error);
      throw error;
    }
  }

  // Get conversation history
  static async getConversationHistory(sessionId: string, limit: number = 50) {
    try {
      const result = await sql`
        SELECT 
          c.id as conversation_id,
          c.created_at as conversation_start,
          m.role,
          m.content,
          m.created_at as message_time,
          m.tokens_used,
          m.model_used
        FROM conversations c
        JOIN messages m ON c.id = m.conversation_id
        WHERE c.session_id = ${sessionId}
        ORDER BY m.created_at DESC
        LIMIT ${limit}
      `;
      
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to get conversation history:', error);
      throw error;
    }
  }

  // Get conversation statistics
  static async getConversationStats() {
    try {
      const result = await sql`
        SELECT 
          COUNT(DISTINCT c.id) as total_conversations,
          COUNT(m.id) as total_messages,
          COUNT(CASE WHEN m.role = 'user' THEN 1 END) as user_messages,
          COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as assistant_messages,
          AVG(m.tokens_used) as avg_tokens_per_message,
          MIN(c.created_at) as first_conversation,
          MAX(c.created_at) as latest_conversation
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
      `;
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to get conversation stats:', error);
      throw error;
    }
  }

  // Search conversations by content
  static async searchConversations(searchTerm: string, limit: number = 20) {
    try {
      const result = await sql`
        SELECT DISTINCT
          c.id as conversation_id,
          c.session_id,
          c.created_at,
          m.content,
          m.role
        FROM conversations c
        JOIN messages m ON c.id = m.conversation_id
        WHERE m.content ILIKE ${`%${searchTerm}%`}
        ORDER BY m.created_at DESC
        LIMIT ${limit}
      `;
      
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to search conversations:', error);
      throw error;
    }
  }

  // Extract IP address from Next.js request
  static extractIpAddress(req: NextRequest): string | undefined {
    // Try to get IP from various headers
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIp) {
      return realIp;
    }
    if (cfConnectingIp) {
      return cfConnectingIp;
    }
    
    return undefined;
  }

  // Generate a unique session ID
  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
