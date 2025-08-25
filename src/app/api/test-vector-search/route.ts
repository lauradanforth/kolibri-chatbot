import { NextRequest } from 'next/server';
import { aiSDKVectorSearchService } from '@/lib/ai-sdk-vector-search';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({
        error: 'Query is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Test vector search
    const results = await aiSDKVectorSearchService.searchDocuments(query, 3);

    return new Response(JSON.stringify({
      success: true,
      query,
      results: results.map(result => ({
        documentName: result.documentName,
        similarity: result.similarity,
        contentPreview: result.content.substring(0, 200) + '...',
        parentFolder: result.parentFolder,
      })),
      totalResults: results.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Vector search test failed:', error);
    return new Response(JSON.stringify({
      error: 'Vector search test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Make sure documents are indexed first by calling /api/index-documents'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const status = aiSDKVectorSearchService.getIndexingStatus();
    
    return new Response(JSON.stringify({
      success: true,
      status,
      instructions: [
        '1. First, index documents: POST /api/index-documents',
        '2. Then test search: POST /api/test-vector-search with {"query": "your search term"}',
        '3. The chatbot will automatically use vector search when available'
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Failed to get vector search status:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get vector search status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
