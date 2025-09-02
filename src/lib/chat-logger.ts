import { DatabaseService } from './database';
import { NextRequest } from 'next/server';
import { TokenCounter } from './token-counter';

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
      
      // Calculate token usage if not provided
      const userTokens = logData.tokensUsed || TokenCounter.estimateTokens(logData.userMessage);
      const assistantTokens = TokenCounter.estimateTokens(logData.assistantResponse);
      const totalTokens = userTokens + assistantTokens;
      
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
        logData.userMessage,
        userTokens
      );

      // Log assistant response
      const assistantMessageId = await DatabaseService.logMessage(
        conversationId,
        'assistant',
        logData.assistantResponse,
        assistantTokens,
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

  // Export conversations to CSV
  static async exportConversations(): Promise<string> {
    try {
      const conversations = await DatabaseService.exportConversations();
      
      // Create CSV header
      const csvHeader = 'Conversation ID,Session ID,Role,Content,Tokens Used,Estimated Cost,Model Used,Timestamp,Documents Used\n';
      
      // Create CSV rows
      const csvRows = conversations.map(conv => {
        const documents = conv.documents_used ? conv.documents_used.join('; ') : '';
        return [
          conv.conversation_id,
          conv.session_id,
          conv.role,
          `"${conv.content.replace(/"/g, '""')}"`, // Escape quotes in content
          conv.tokens_used || '',
          conv.estimated_cost || '',
          conv.model_used || '',
          conv.created_at,
          `"${documents}"`
        ].join(',');
      }).join('\n');
      
      return csvHeader + csvRows;
    } catch (error) {
      console.error('❌ Failed to export conversations:', error);
      return 'Error: Failed to export conversations';
    }
  }

  // Log complete conversation (user message + assistant response) - creates conversation if it doesn't exist
  static async logCompleteConversation(
    sessionId: string,
    userMessage: string,
    assistantResponse: string,
    modelUsed: string = 'gpt-3.5-turbo'
  ) {
    try {
      console.log(`📝 Logging complete conversation for session: ${sessionId}`);
      
      // Check if conversation already exists
      let conversation = await DatabaseService.getConversationBySessionId(sessionId);
      
      if (!conversation) {
        console.log(`🆕 Creating new conversation for session: ${sessionId}`);
        // Create new conversation
        const conversationId = await DatabaseService.createConversation(
          sessionId,
          'Test Page Client',
          '127.0.0.1'
        );
        conversation = { id: conversationId };
      }

      // Log user message
      const userTokens = TokenCounter.estimateTokens(userMessage);
      const userMessageId = await DatabaseService.logMessage(
        conversation.id,
        'user',
        userMessage,
        userTokens
      );

      // Log assistant response
      const assistantTokens = TokenCounter.estimateTokens(assistantResponse);
      const assistantMessageId = await DatabaseService.logMessage(
        conversation.id,
        'assistant',
        assistantResponse,
        assistantTokens,
        modelUsed
      );

      const totalTokens = userTokens + assistantTokens;
      const totalCost = TokenCounter.estimateCost(totalTokens);

      console.log(`✅ Complete conversation logged successfully:`, {
        sessionId,
        conversationId: conversation.id,
        userMessageId,
        assistantMessageId,
        totalTokens,
        totalCost
      });

      return {
        conversationId: conversation.id,
        userMessageId,
        assistantMessageId,
        totalTokens,
        totalCost
      };
    } catch (error) {
      console.error('❌ Failed to log complete conversation:', error);
      throw error;
    }
  }

  // Log assistant response by session ID (for client-side logging)
  static async logAssistantResponseBySession(
    sessionId: string,
    response: string,
    modelUsed: string = 'gpt-3.5-turbo'
  ) {
    try {
      // Find the conversation by session ID
      const conversation = await DatabaseService.getConversationBySessionId(sessionId);
      if (!conversation) {
        throw new Error(`Conversation not found for session: ${sessionId}`);
      }

      // Calculate tokens and cost
      const tokensUsed = TokenCounter.estimateTokens(response);
      const estimatedCost = TokenCounter.estimateCost(tokensUsed);

      // Log the assistant response
      const messageId = await DatabaseService.logMessage(
        conversation.id,
        'assistant',
        response,
        tokensUsed,
        modelUsed
      );

      console.log(`✅ Logged assistant response for session ${sessionId}, message ID: ${messageId}`);
      return { messageId, tokensUsed, estimatedCost };
    } catch (error) {
      console.error('❌ Failed to log assistant response by session:', error);
      throw error;
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
