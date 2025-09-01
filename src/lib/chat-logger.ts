import { DatabaseService } from './database';
import { NextRequest } from 'next/server';

// Interface for logging data
export interface ChatLogData {
  sessionId: string;
  userMessage: string;
  assistantResponse: string;
  documentsUsed: any[];
  tokensUsed?: number;
  modelUsed?: string;
  userAgent?: string;
  ipAddress?: string;
}

// Chat logging service
export class ChatLogger {
  // Log a complete chat interaction
  static async logChatInteraction(req: NextRequest, logData: ChatLogData) {
    try {
      // Extract IP address from request
      const ipAddress = DatabaseService.extractIpAddress(req);
      
      // Create or get conversation
      const conversationId = await DatabaseService.createConversation(
        logData.sessionId,
        logData.userAgent,
        ipAddress
      );

      // Log user message
      const userMessageId = await DatabaseService.logMessage(
        conversationId,
        'user',
        logData.userMessage
      );

      // Log assistant response
      const assistantMessageId = await DatabaseService.logMessage(
        conversationId,
        'assistant',
        logData.assistantResponse,
        logData.tokensUsed,
        logData.modelUsed
      );

      // Log context usage (which documents were used)
      if (logData.documentsUsed && logData.documentsUsed.length > 0) {
        for (const doc of logData.documentsUsed) {
          await DatabaseService.logContextUsage(
            assistantMessageId,
            doc.name || 'Unknown Document',
            doc.webViewLink || doc.source || 'Unknown Source',
            doc.parentFolder || 'Unknown Type',
            doc.relevanceScore || doc.similarity || null,
            doc.searchMethod || 'google-drive'
          );
        }
      }

      console.log(`✅ Chat interaction logged successfully - Conversation ID: ${conversationId}`);
      return conversationId;
    } catch (error) {
      console.error('❌ Failed to log chat interaction:', error);
      // Don't throw error - logging failure shouldn't break chat functionality
      return null;
    }
  }

  // Log just a user message (for when you want to log before getting response)
  static async logUserMessage(
    req: NextRequest,
    sessionId: string,
    userMessage: string,
    userAgent?: string
  ) {
    try {
      const ipAddress = DatabaseService.extractIpAddress(req);
      const conversationId = await DatabaseService.createConversation(
        sessionId,
        userAgent,
        ipAddress
      );

      await DatabaseService.logMessage(
        conversationId,
        'user',
        userMessage
      );

      return conversationId;
    } catch (error) {
      console.error('❌ Failed to log user message:', error);
      return null;
    }
  }

  // Log assistant response to existing conversation
  static async logAssistantResponse(
    conversationId: number,
    response: string,
    documentsUsed: any[],
    tokensUsed?: number,
    modelUsed?: string
  ) {
    try {
      const messageId = await DatabaseService.logMessage(
        conversationId,
        'assistant',
        response,
        tokensUsed,
        modelUsed
      );

      // Log context usage
      if (documentsUsed && documentsUsed.length > 0) {
        for (const doc of documentsUsed) {
          await DatabaseService.logContextUsage(
            messageId,
            doc.name || 'Unknown Document',
            doc.webViewLink || doc.source || 'Unknown Source',
            doc.parentFolder || 'Unknown Type',
            doc.relevanceScore || doc.similarity || null,
            doc.searchMethod || 'google-drive'
          );
        }
      }

      return messageId;
    } catch (error) {
      console.error('❌ Failed to log assistant response:', error);
      return null;
    }
  }

  // Get conversation history for a session
  static async getConversationHistory(sessionId: string, limit: number = 50) {
    try {
      return await DatabaseService.getConversationHistory(sessionId, limit);
    } catch (error) {
      console.error('❌ Failed to get conversation history:', error);
      return [];
    }
  }

  // Get overall conversation statistics
  static async getConversationStats() {
    try {
      return await DatabaseService.getConversationStats();
    } catch (error) {
      console.error('❌ Failed to get conversation stats:', error);
      return null;
    }
  }

  // Search conversations by content
  static async searchConversations(searchTerm: string, limit: number = 20) {
    try {
      return await DatabaseService.searchConversations(searchTerm, limit);
    } catch (error) {
      console.error('❌ Failed to search conversations:', error);
      return [];
    }
  }

  // Initialize database tables (call this once during app startup)
  static async initialize() {
    try {
      await DatabaseService.initializeDatabase();
      console.log('✅ Chat logger initialized successfully');
    } catch (error) {
      console.error('❌ Chat logger initialization failed:', error);
      throw error;
    }
  }
}
