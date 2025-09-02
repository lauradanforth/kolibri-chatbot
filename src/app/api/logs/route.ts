import { NextRequest, NextResponse } from 'next/server';
import { ChatLogger } from '@/lib/chat-logger';

// GET /api/logs - Get conversation statistics and search
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const sessionId = searchParams.get('sessionId');
    const searchTerm = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');

    switch (action) {
      case 'stats':
        // Get overall conversation statistics
        const stats = await ChatLogger.getConversationStats();
        return NextResponse.json({ success: true, data: stats });

      case 'history':
        // Get conversation history for a specific session
        if (!sessionId) {
          return NextResponse.json(
            { error: 'sessionId is required for history action' },
            { status: 400 }
          );
        }
        const history = await ChatLogger.getConversationHistory(sessionId, limit);
        return NextResponse.json({ success: true, data: history });

      case 'search':
        // Search conversations by content
        if (!searchTerm) {
          return NextResponse.json(
            { error: 'search term is required for search action' },
            { status: 400 }
          );
        }
        const searchResults = await ChatLogger.searchConversations(searchTerm, limit);
        return NextResponse.json({ success: true, data: searchResults });

      case 'export':
        // Export conversations to CSV
        const exportData = await ChatLogger.exportConversations();
        const csvContent = exportData;
        const response = new NextResponse(csvContent);
        response.headers.set('Content-Type', 'text/csv');
        response.headers.set('Content-Disposition', `attachment; filename="chat-logs-${new Date().toISOString().split('T')[0]}.csv"`);
        return response;

      default:
        // Return available actions
        return NextResponse.json({
          success: true,
          message: 'Chat logs API endpoint',
          availableActions: [
            'GET /api/logs?action=stats - Get conversation statistics',
            'GET /api/logs?action=history&sessionId=<id> - Get conversation history',
            'GET /api/logs?action=search&search=<term> - Search conversations',
            'GET /api/logs?action=export - Export conversations to CSV'
          ]
        });
    }
  } catch (error) {
    console.error('Logs API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/logs - Initialize database and log assistant responses
export async function POST(req: NextRequest) {
  try {
    const { action, sessionId, content, userMessage, assistantResponse, modelUsed } = await req.json();

    switch (action) {
      case 'initialize':
        await ChatLogger.initialize();
        return NextResponse.json({ 
          success: true, 
          message: 'Database initialized successfully' 
        });

      case 'log-complete-conversation':
        console.log('📝 Received complete conversation logging request:', { sessionId, userMessageLength: userMessage?.length, assistantResponseLength: assistantResponse?.length, modelUsed });
        
        if (!sessionId || !userMessage || !assistantResponse) {
          console.error('❌ Missing required fields:', { sessionId: !!sessionId, userMessage: !!userMessage, assistantResponse: !!assistantResponse });
          return NextResponse.json(
            { error: 'sessionId, userMessage, and assistantResponse are required for log-complete-conversation' },
            { status: 400 }
          );
        }
        
        try {
          // Log the complete conversation (user message + assistant response)
          const result = await ChatLogger.logCompleteConversation(
            sessionId,
            userMessage,
            assistantResponse,
            modelUsed || 'gpt-3.5-turbo'
          );
          
          console.log('✅ Complete conversation logged successfully:', result);
          return NextResponse.json({ 
            success: true, 
            message: 'Complete conversation logged successfully',
            data: result
          });
        } catch (error) {
          console.error('❌ Failed to log complete conversation:', error);
          return NextResponse.json(
            { error: 'Failed to log complete conversation', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          );
        }

      case 'log-assistant-response':
        console.log('📝 Received assistant response logging request:', { sessionId, contentLength: content?.length, modelUsed });
        
        if (!sessionId || !content) {
          console.error('❌ Missing required fields:', { sessionId: !!sessionId, content: !!content });
          return NextResponse.json(
            { error: 'sessionId and content are required for log-assistant-response' },
            { status: 400 }
          );
        }
        
        try {
          // Find the conversation by session ID and log the assistant response
          const result = await ChatLogger.logAssistantResponseBySession(
            sessionId,
            content,
            modelUsed || 'gpt-3.5-turbo'
          );
          
          console.log('✅ Assistant response logged successfully:', result);
          return NextResponse.json({ 
            success: true, 
            message: 'Assistant response logged successfully',
            data: result
          });
        } catch (error) {
          console.error('❌ Failed to log assistant response:', error);
          return NextResponse.json(
            { error: 'Failed to log assistant response', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Logs API initialization error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initialize database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
