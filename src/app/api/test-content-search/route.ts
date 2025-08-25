import { NextRequest } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    
    // Test content-based search
    const searchResults = await googleDriveService.searchDocuments(query);
    
    return new Response(JSON.stringify({
      query,
      totalResults: searchResults.length,
      results: searchResults.map(doc => ({
        id: doc.id,
        name: doc.name,
        parentFolder: doc.parentFolder,
        relevanceScore: doc.relevanceScore,
        contentPreview: doc.content?.substring(0, 100) + '...',
        hasContent: !!doc.content && !doc.content.includes('[Document content not accessible')
      }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Test content search error:', error);
    return new Response(JSON.stringify({
      error: 'Test content search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
