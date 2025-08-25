import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    documentId: string;
    documentName: string;
    chunkIndex: number;
    parentFolder?: string;
  };
}

export class VectorSearchService {
  private pinecone: Pinecone;
  private embeddings: OpenAIEmbeddings;
  private indexName = 'kolibri-documents';

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Split document content into chunks for better vector search
   */
  private splitIntoChunks(content: string, documentId: string, documentName: string, parentFolder?: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Group sentences into chunks of ~500 characters
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > 500 && currentChunk.length > 0) {
        chunks.push({
          id: `${documentId}-chunk-${chunkIndex}`,
          content: currentChunk.trim(),
          metadata: {
            documentId,
            documentName,
            chunkIndex,
            parentFolder,
          },
        });
        currentChunk = sentence;
        chunkIndex++;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
    
    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `${documentId}-chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          documentId,
          documentName,
          chunkIndex,
          parentFolder,
        },
      });
    }
    
    return chunks;
  }

  /**
   * Index documents in the vector database
   */
  async indexDocuments(documents: Array<{
    id: string;
    name: string;
    content: string;
    parentFolder?: string;
  }>) {
    const index = this.pinecone.index(this.indexName);
    
    for (const doc of documents) {
      // Split document into chunks
      const chunks = this.splitIntoChunks(doc.content, doc.id, doc.name, doc.parentFolder);
      
      // Create embeddings for each chunk
      for (const chunk of chunks) {
        const embedding = await this.embeddings.embedQuery(chunk.content);
        
        await index.upsert([{
          id: chunk.id,
          values: embedding,
          metadata: chunk.metadata,
        }]);
      }
    }
  }

  /**
   * Search for relevant documents using semantic similarity
   */
  async searchDocuments(query: string, topK: number = 5) {
    const index = this.pinecone.index(this.indexName);
    
    // Create embedding for the query
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    // Search for similar vectors
    const searchResults = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    // Group results by document and calculate relevance scores
    const documentScores = new Map<string, {
      documentId: string;
      documentName: string;
      parentFolder?: string;
      chunks: Array<{
        content: string;
        score: number;
      }>;
      totalScore: number;
    }>();

    for (const match of searchResults.matches || []) {
      const metadata = match.metadata as any;
      const documentId = metadata.documentId;
      
      if (!documentScores.has(documentId)) {
        documentScores.set(documentId, {
          documentId,
          documentName: metadata.documentName,
          parentFolder: metadata.parentFolder,
          chunks: [],
          totalScore: 0,
        });
      }
      
      const doc = documentScores.get(documentId)!;
      doc.chunks.push({
        content: metadata.content || '',
        score: match.score || 0,
      });
      doc.totalScore += match.score || 0;
    }

    // Sort by total relevance score and return top results
    return Array.from(documentScores.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, topK);
  }

  /**
   * Hybrid search: Combine vector search with keyword search
   */
  async hybridSearch(query: string, topK: number = 5) {
    // Get vector search results
    const vectorResults = await this.searchDocuments(query, topK);
    
    // You could also combine with keyword search here
    // const keywordResults = await this.keywordSearch(query, topK);
    
    // For now, return vector results
    return vectorResults;
  }
}

// Usage example:
export const vectorSearchService = new VectorSearchService();
