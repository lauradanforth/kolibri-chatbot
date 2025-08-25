import { NextRequest } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

export async function GET(req: NextRequest) {
  try {
    const documents = await googleDriveService.listDocuments();
    const results = [];
    
    for (const doc of documents.slice(0, 2)) { // Test first 2 documents
      try {
        const content = await googleDriveService.getDocumentContent(doc.id, doc.mimeType);
        results.push({
          id: doc.id,
          name: doc.name,
          mimeType: doc.mimeType,
          contentLength: content.length,
          contentPreview: content.substring(0, 200),
          hasContent: content.length > 0 && !content.includes('[Document content not accessible')
        });
      } catch (error) {
        results.push({
          id: doc.id,
          name: doc.name,
          mimeType: doc.mimeType,
          error: error instanceof Error ? error.message : 'Unknown error',
          hasContent: false
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Test content error:', error);
    return new Response(JSON.stringify({
      error: 'Test content failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
