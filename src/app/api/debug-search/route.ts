import { NextRequest } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    
    // Test different search methods
    const allDocs = await googleDriveService.listDocuments();
    const searchResults = await googleDriveService.searchDocuments(query);
    const relevantDocs = await googleDriveService.getRelevantDocuments(query);
    
    return new Response(JSON.stringify({
      query,
      allDocuments: allDocs.map(doc => ({ id: doc.id, name: doc.name, mimeType: doc.mimeType })),
      searchResults: searchResults.map(doc => ({ id: doc.id, name: doc.name, mimeType: doc.mimeType, hasContent: !!doc.content })),
      relevantDocs: relevantDocs.map(doc => ({ id: doc.id, name: doc.name, mimeType: doc.mimeType, hasContent: !!doc.content })),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Debug search error:', error);
    return new Response(JSON.stringify({
      error: 'Debug search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
