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

      default:
        // Return available actions
        return NextResponse.json({
          success: true,
          message: 'Chat logs API endpoint',
          availableActions: [
            'GET /api/logs?action=stats - Get conversation statistics',
            'GET /api/logs?action=history&sessionId=<id> - Get conversation history',
            'GET /api/logs?action=search&search=<term> - Search conversations'
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

// POST /api/logs - Initialize database (admin only)
export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    if (action === 'initialize') {
      await ChatLogger.initialize();
      return NextResponse.json({ 
        success: true, 
        message: 'Database initialized successfully' 
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
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
