import { NextRequest } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

export async function GET(req: NextRequest) {
  try {
    const documents = await googleDriveService.listDocuments();
    
    // If no documents found via API, try the fallback method
    if (documents.length === 0) {
      const fallbackDocs = await googleDriveService.listPublicDocuments();
      return new Response(JSON.stringify({
        success: true,
        documents: fallbackDocs.map(doc => ({
          name: doc.name,
          id: doc.id,
          mimeType: doc.mimeType,
          webViewLink: doc.webViewLink
        })),
        note: "Using fallback document list (public folder access)"
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      documents: documents.map(doc => ({
        name: doc.name,
        id: doc.id,
        mimeType: doc.mimeType,
        webViewLink: doc.webViewLink
      })),
      note: "Using Google Drive API access"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Test Drive API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
