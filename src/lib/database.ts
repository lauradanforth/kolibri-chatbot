import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { TokenCounter } from './token-counter';

// Supabase client
const supabaseUrl = "https://rbtlsinkjuqwnwyqevzv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidGxzaW5ranVxd253eXFldnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc2ODc0MiwiZXhwIjoyMDcyMzQ0NzQyfQ.stUkrtnabeiOJrJ5RjuXrnnHA6hC6UmUy29-9hD4JFQ";
const supabase = createClient(supabaseUrl, supabaseKey);

// Database service for chatbot logging
export class DatabaseService {
  // Initialize database tables
  static async initializeDatabase() {
    try {
      // For Supabase, tables should already be created via SQL Editor
      console.log('✅ Database tables should already exist in Supabase');
      console.log('📝 If tables are missing, run the schema in Supabase SQL Editor');
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  // Create a new conversation
  static async createConversation(sessionId: string, userAgent?: string, ipAddress?: string) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          session_id: sessionId,
          user_agent: userAgent || null,
          ip_address: ipAddress || null
        })
        .select('id')
        .single();
      
      if (error) throw error;
      return data.id;
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
      // Calculate estimated cost if tokens are provided
      const estimatedCost = tokensUsed ? TokenCounter.estimateCost(tokensUsed) : 0;
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: role,
          content: content,
          tokens_used: tokensUsed || null,
          model_used: modelUsed || null,
          estimated_cost: estimatedCost
        })
        .select('id')
        .single();
      
      if (error) throw error;
      return data.id;
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
      const { error } = await supabase
        .from('context_used')
        .insert({
          message_id: messageId,
          document_name: documentName,
          document_source: documentSource,
          document_type: documentType,
          relevance_score: relevanceScore || null,
          search_method: searchMethod || null
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('❌ Failed to log context usage:', error);
      throw error;
    }
  }

  // Get conversation history
  static async getConversationHistory(sessionId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          created_at,
          messages!inner(
            role,
            content,
            created_at,
            tokens_used,
            model_used
          )
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return data?.map(conv => ({
        conversation_id: conv.id,
        conversation_start: conv.created_at,
        role: conv.messages[0]?.role,
        content: conv.messages[0]?.content,
        message_time: conv.messages[0]?.created_at,
        tokens_used: conv.messages[0]?.tokens_used,
        model_used: conv.messages[0]?.model_used
      })) || [];
    } catch (error) {
      console.error('❌ Failed to get conversation history:', error);
      throw error;
    }
  }

  // Get conversation statistics
  static async getConversationStats() {
    try {
      // Get total conversations
      const { count: totalConversations, error: convError } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });
      
      if (convError) throw convError;
      
      // Get total messages
      const { count: totalMessages, error: msgError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });
      
      if (msgError) throw msgError;
      
      // Get user and assistant message counts
      const { data: roleCounts, error: roleError } = await supabase
        .from('messages')
        .select('role');
      
      if (roleError) throw roleError;
      
      const userMessages = roleCounts?.filter(m => m.role === 'user').length || 0;
      const assistantMessages = roleCounts?.filter(m => m.role === 'assistant').length || 0;
      
      // Get token and cost stats
      const { data: tokenStats, error: tokenError } = await supabase
        .from('messages')
        .select('tokens_used, estimated_cost, created_at');
      
      if (tokenError) throw tokenError;
      
      const totalTokens = tokenStats?.reduce((sum, m) => sum + (m.tokens_used || 0), 0) || 0;
      const totalCost = tokenStats?.reduce((sum, m) => sum + (m.estimated_cost || 0), 0) || 0;
      const avgTokens = tokenStats?.length > 0 ? totalTokens / tokenStats.length : 0;
      
      // Get date range
      const { data: dateRange, error: dateError } = await supabase
        .from('conversations')
        .select('created_at')
        .order('created_at', { ascending: true });
      
      if (dateError) throw dateError;
      
      const firstConversation = dateRange?.[0]?.created_at || null;
      const latestConversation = dateRange?.[dateRange.length - 1]?.created_at || null;
      
      return {
        total_conversations: totalConversations || 0,
        total_messages: totalMessages || 0,
        user_messages: userMessages,
        assistant_messages: assistantMessages,
        avg_tokens_per_message: avgTokens,
        total_tokens: totalTokens,
        total_cost: totalCost,
        first_conversation: firstConversation,
        latest_conversation: latestConversation
      };
    } catch (error) {
      console.error('❌ Failed to get conversation stats:', error);
      throw error;
    }
  }

  // Search conversations by content
  static async searchConversations(searchTerm: string, limit: number = 20) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          conversation_id,
          conversations!inner(session_id, created_at),
          content,
          role
        `)
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return data?.map((item: any) => ({
        conversation_id: item.conversation_id,
        session_id: item.conversations?.session_id,
        created_at: item.conversations?.created_at,
        content: item.content,
        role: item.role
      })) || [];
    } catch (error) {
      console.error('❌ Failed to search conversations:', error);
      throw error;
    }
  }

  // Export conversations for CSV download
  static async exportConversations() {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          conversation_id,
          conversations!inner(session_id),
          role,
          content,
          tokens_used,
          estimated_cost,
          model_used,
          created_at,
          context_used(document_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data?.map((item: any) => ({
        conversation_id: item.conversation_id,
        session_id: item.conversations?.session_id,
        role: item.role,
        content: item.content,
        tokens_used: item.tokens_used,
        estimated_cost: item.estimated_cost,
        model_used: item.model_used,
        created_at: item.created_at,
        documents_used: item.context_used?.map((c: any) => c.document_name) || []
      })) || [];
    } catch (error) {
      console.error('❌ Failed to export conversations:', error);
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

  // Get conversation by session ID
  static async getConversationBySessionId(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Failed to get conversation by session ID:', error);
      return null;
    }
  }

  // Generate a unique session ID
  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
