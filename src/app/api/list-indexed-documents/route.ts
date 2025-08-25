import { NextRequest } from 'next/server';
import { aiSDKVectorSearchService } from '@/lib/ai-sdk-vector-search';

export async function GET(req: NextRequest) {
  try {
    const status = aiSDKVectorSearchService.getIndexingStatus();
    
    if (!status.isIndexed || status.totalChunks === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No documents are currently indexed',
        status,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the document chunks to extract unique documents
    const chunks = aiSDKVectorSearchService.getDocumentChunks();
    
    // Group chunks by document
    const documents = new Map<string, {
      documentId: string;
      documentName: string;
      parentFolder?: string;
      chunkCount: number;
      totalContentLength: number;
    }>();
    
    for (const chunk of chunks) {
      const docId = chunk.metadata.documentId;
      
      if (!documents.has(docId)) {
        documents.set(docId, {
          documentId: docId,
          documentName: chunk.metadata.documentName,
          parentFolder: chunk.metadata.parentFolder,
          chunkCount: 0,
          totalContentLength: 0,
        });
      }
      
      const doc = documents.get(docId)!;
      doc.chunkCount++;
      doc.totalContentLength += chunk.content.length;
    }

    const documentList = Array.from(documents.values()).sort((a, b) => 
      a.documentName.localeCompare(b.documentName)
    );

    return new Response(JSON.stringify({
      success: true,
      status,
      documents: documentList,
      summary: {
        totalDocuments: documentList.length,
        totalChunks: status.totalChunks,
        totalEmbeddings: status.totalEmbeddings,
        averageChunksPerDocument: Math.round(status.totalChunks / documentList.length),
        averageContentLength: Math.round(documentList.reduce((sum, doc) => sum + doc.totalContentLength, 0) / documentList.length),
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Failed to list indexed documents:', error);
    return new Response(JSON.stringify({
      error: 'Failed to list indexed documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
