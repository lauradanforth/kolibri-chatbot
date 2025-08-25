import { ChromaClient, Collection } from 'chromadb';
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

export class ChromaSearchService {
  private client: ChromaClient;
  private embeddings: OpenAIEmbeddings;
  private collection: Collection;
  private collectionName = 'kolibri-documents';

  constructor() {
    this.client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000',
    });
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    this.initializeCollection();
  }

  private async initializeCollection() {
    try {
      this.collection = await this.client.getCollection({
        name: this.collectionName,
      });
    } catch (error) {
      // Create collection if it doesn't exist
      this.collection = await this.client.createCollection({
        name: this.collectionName,
        metadata: {
          description: 'Kolibri documents for semantic search',
        },
      });
    }
  }

  /**
   * Split document content into chunks
   */
  private splitIntoChunks(content: string, documentId: string, documentName: string, parentFolder?: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
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
   * Index documents in ChromaDB
   */
  async indexDocuments(documents: Array<{
    id: string;
    name: string;
    content: string;
    parentFolder?: string;
  }>) {
    await this.initializeCollection();
    
    for (const doc of documents) {
      const chunks = this.splitIntoChunks(doc.content, doc.id, doc.name, doc.parentFolder);
      
      for (const chunk of chunks) {
        const embedding = await this.embeddings.embedQuery(chunk.content);
        
        await this.collection.add({
          ids: [chunk.id],
          embeddings: [embedding],
          documents: [chunk.content],
          metadatas: [chunk.metadata],
        });
      }
    }
  }

  /**
   * Search for relevant documents using semantic similarity
   */
  async searchDocuments(query: string, topK: number = 5) {
    await this.initializeCollection();
    
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    const results = await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK * 2, // Get more results to group by document
      include: ['documents', 'metadatas', 'distances'],
    });

    // Group results by document
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

    if (results.metadatas && results.documents && results.distances) {
      for (let i = 0; i < results.metadatas[0].length; i++) {
        const metadata = results.metadatas[0][i] as any;
        const content = results.documents[0][i];
        const distance = results.distances[0][i];
        const score = 1 - distance; // Convert distance to similarity score
        
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
          content,
          score,
        });
        doc.totalScore += score;
      }
    }

    return Array.from(documentScores.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, topK);
  }
}

export const chromaSearchService = new ChromaSearchService();
