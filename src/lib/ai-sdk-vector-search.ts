import { embed, embedMany, cosineSimilarity } from 'ai';
import { openai } from '@ai-sdk/openai';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

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

interface SearchResult {
  documentId: string;
  documentName: string;
  parentFolder?: string;
  content: string;
  similarity: number;
}

interface IndexData {
  documentChunks: DocumentChunk[];
  chunkEmbeddings: number[][];
  indexedAt: string;
  totalDocuments: number;
}

export class AISDKVectorSearchService {
  private documentChunks: DocumentChunk[] = [];
  private chunkEmbeddings: number[][] = [];
  private isIndexed = false;
  private indexFilePath: string;

  constructor() {
    // Store index in a data directory
    this.indexFilePath = join(process.cwd(), 'data', 'vector-index.json');
    this.loadIndexFromFile();
  }

  /**
   * Load existing index from file
   */
  private loadIndexFromFile() {
    try {
      if (existsSync(this.indexFilePath)) {
        const indexData: IndexData = JSON.parse(readFileSync(this.indexFilePath, 'utf-8'));
        this.documentChunks = indexData.documentChunks;
        this.chunkEmbeddings = indexData.chunkEmbeddings;
        this.isIndexed = true;
        console.log(`📁 Loaded existing index with ${this.documentChunks.length} chunks from ${indexData.indexedAt}`);
      }
    } catch (error) {
      console.warn('⚠️ Could not load existing index:', error);
    }
  }

  /**
   * Save index to file
   */
  private saveIndexToFile() {
    try {
      // Ensure data directory exists
      const { mkdirSync } = require('fs');
      const dataDir = join(process.cwd(), 'data');
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      const indexData: IndexData = {
        documentChunks: this.documentChunks,
        chunkEmbeddings: this.chunkEmbeddings,
        indexedAt: new Date().toISOString(),
        totalDocuments: new Set(this.documentChunks.map(chunk => chunk.metadata.documentId)).size,
      };

      writeFileSync(this.indexFilePath, JSON.stringify(indexData, null, 2));
      console.log(`💾 Saved index to ${this.indexFilePath}`);
    } catch (error) {
      console.error('❌ Failed to save index:', error);
    }
  }

  /**
   * Split document content into chunks for better vector search
   */
  private splitIntoChunks(content: string, documentId: string, documentName: string, parentFolder?: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    // Clean and normalize content
    const cleanContent = content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.!?,-]/g, '') // Remove special characters that might cause token issues
      .trim();
    
    // Split into smaller chunks (300 characters max to stay well under token limits)
    const maxChunkSize = 300;
    let currentChunk = '';
    let chunkIndex = 0;
    
    // Split by sentences first, then by words if needed
    const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 5);
    
    for (const sentence of sentences) {
      const sentenceTrimmed = sentence.trim();
      
      if ((currentChunk + ' ' + sentenceTrimmed).length > maxChunkSize && currentChunk.length > 0) {
        // Current chunk is full, save it
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
        currentChunk = sentenceTrimmed;
        chunkIndex++;
      } else {
        // Add sentence to current chunk
        currentChunk += (currentChunk ? ' ' : '') + sentenceTrimmed;
      }
    }
    
    // Add the last chunk if it has content
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
   * Index documents using AI SDK embeddings
   */
  async indexDocuments(documents: Array<{
    id: string;
    name: string;
    content: string;
    parentFolder?: string;
  }>) {
    try {
      console.log('🔄 Indexing documents with AI SDK embeddings...');
      
      // Clear existing data
      this.documentChunks = [];
      this.chunkEmbeddings = [];
      
      // Split all documents into chunks
      for (const doc of documents) {
        const chunks = this.splitIntoChunks(doc.content, doc.id, doc.name, doc.parentFolder);
        this.documentChunks.push(...chunks);
      }
      
      // Create embeddings in batches to avoid token limits
      const batchSize = 50; // Process 50 chunks at a time
      this.chunkEmbeddings = [];
      
      for (let i = 0; i < this.documentChunks.length; i += batchSize) {
        const batch = this.documentChunks.slice(i, i + batchSize);
        const batchContents = batch.map(chunk => chunk.content);
        
        console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(this.documentChunks.length / batchSize)} (${batch.length} chunks)`);
        
        const { embeddings } = await embedMany({
          model: openai.textEmbeddingModel('text-embedding-3-small'),
          values: batchContents,
          maxParallelCalls: 3, // Reduced for stability
        });
        
        this.chunkEmbeddings.push(...embeddings);
      }
      this.isIndexed = true;
      this.saveIndexToFile(); // Save after indexing
      
      console.log(`✅ Indexed ${this.documentChunks.length} chunks with AI SDK embeddings`);
      return this.documentChunks.length;
      
    } catch (error) {
      console.error('❌ Failed to index documents with AI SDK:', error);
      throw error;
    }
  }

  /**
   * Search for relevant documents using semantic similarity
   */
  async searchDocuments(query: string, topK: number = 5): Promise<SearchResult[]> {
    if (!this.isIndexed || this.documentChunks.length === 0) {
      throw new Error('No documents indexed. Please call indexDocuments() first.');
    }

    try {
      // Create embedding for the query
      const { embedding: queryEmbedding } = await embed({
        model: openai.textEmbeddingModel('text-embedding-3-small'),
        value: query,
      });

      // Calculate similarity with all chunks
      const similarities = this.chunkEmbeddings.map((chunkEmbedding, index) => ({
        index,
        similarity: cosineSimilarity(queryEmbedding, chunkEmbedding),
      }));

      // Sort by similarity and get top results
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      // Group results by document
      const documentScores = new Map<string, {
        documentId: string;
        documentName: string;
        parentFolder?: string;
        chunks: Array<{
          content: string;
          similarity: number;
        }>;
        totalSimilarity: number;
      }>();

      for (let i = 0; i < Math.min(topK * 2, similarities.length); i++) {
        const { index, similarity } = similarities[i];
        const chunk = this.documentChunks[index];
        const documentId = chunk.metadata.documentId;
        
        if (!documentScores.has(documentId)) {
          documentScores.set(documentId, {
            documentId,
            documentName: chunk.metadata.documentName,
            parentFolder: chunk.metadata.parentFolder,
            chunks: [],
            totalSimilarity: 0,
          });
        }
        
        const doc = documentScores.get(documentId)!;
        doc.chunks.push({
          content: chunk.content,
          similarity,
        });
        doc.totalSimilarity += similarity;
      }

      // Convert to search results and sort by total similarity
      const results: SearchResult[] = Array.from(documentScores.values())
        .sort((a, b) => b.totalSimilarity - a.totalSimilarity)
        .slice(0, topK)
        .map(doc => ({
          documentId: doc.documentId,
          documentName: doc.documentName,
          parentFolder: doc.parentFolder,
          content: doc.chunks.map(chunk => chunk.content).join(' '),
          similarity: doc.totalSimilarity / doc.chunks.length, // Average similarity
        }));

      return results;
      
    } catch (error) {
      console.error('❌ Failed to search documents with AI SDK:', error);
      throw error;
    }
  }

  /**
   * Get indexing status
   */
  getIndexingStatus() {
    return {
      isIndexed: this.isIndexed,
      totalChunks: this.documentChunks.length,
      totalEmbeddings: this.chunkEmbeddings.length,
      indexFilePath: this.indexFilePath,
      lastIndexed: this.isIndexed ? new Date().toISOString() : null,
    };
  }

  /**
   * Get document chunks for analysis
   */
  getDocumentChunks() {
    return this.documentChunks;
  }

  /**
   * Clear all indexed data
   */
  clearIndex() {
    this.documentChunks = [];
    this.chunkEmbeddings = [];
    this.isIndexed = false;
    this.saveIndexToFile(); // Save after clearing
    console.log('🗑️ Cleared vector search index');
  }
}

// Export singleton instance
export const aiSDKVectorSearchService = new AISDKVectorSearchService();
