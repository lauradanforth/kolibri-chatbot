import { NextRequest } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Starting document indexing for vector search...');
    
    // Index documents for vector search
    const indexedCount = await googleDriveService.indexDocumentsForVectorSearch();
    
    return new Response(JSON.stringify({
      success: true,
      message: `Successfully indexed ${indexedCount} documents for vector search`,
      indexedCount,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Document indexing failed:', error);
    return new Response(JSON.stringify({
      error: 'Document indexing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get indexing status
    const { aiSDKVectorSearchService } = await import('@/lib/ai-sdk-vector-search');
    const status = aiSDKVectorSearchService.getIndexingStatus();
    
    return new Response(JSON.stringify({
      success: true,
      status,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Failed to get indexing status:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get indexing status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
