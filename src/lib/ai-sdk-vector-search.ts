import { embed, embedMany, cosineSimilarity } from 'ai';
import { openai } from '@ai-sdk/openai';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: 'google-drive' | 'kolibri-user-guide';
    documentId: string;
    documentName: string;
    chunkIndex: number;
    parentFolder?: string;
    // User Guide specific fields
    url?: string;
    section?: string;
    parentSection?: string;
    topics?: string[];
    wordCount?: number;
  };
}

interface SearchResult {
  documentId: string;
  documentName: string;
  parentFolder?: string;
  content: string;
  similarity: number;
  source: 'google-drive' | 'kolibri-user-guide';
  url?: string;
  section?: string;
  parentSection?: string;
  topics?: string[];
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
    
    // Load User Guide chunks if available
    this.loadUserGuideChunks().catch(error => {
      console.warn('⚠️ Could not load User Guide chunks:', error);
    });
  }

  /**
   * Load existing index from file
   */
  private loadIndexFromFile() {
    try {
      if (existsSync(this.indexFilePath)) {
        const indexData: IndexData = JSON.parse(readFileSync(this.indexFilePath, 'utf-8'));
        
        // Add missing source field to Google Drive chunks
        this.documentChunks = indexData.documentChunks.map(chunk => ({
          ...chunk,
          metadata: {
            ...chunk.metadata,
            source: 'google-drive' as const, // Add missing source field
          }
        }));
        
        this.chunkEmbeddings = indexData.chunkEmbeddings;
        this.isIndexed = true;
        console.log(`📁 Loaded existing index with ${this.documentChunks.length} chunks from ${indexData.indexedAt}`);
        console.log(`📊 Google Drive chunks: ${this.documentChunks.filter(c => c.metadata.source === 'google-drive').length}`);
      }
    } catch (error) {
      console.warn('⚠️ Could not load existing index:', error);
    }
  }

  /**
   * Load User Guide chunks and embeddings from the indexed JSON files
   */
  async loadUserGuideChunks(): Promise<number> {
    try {
      const userGuideChunksPath = join(process.cwd(), 'data', 'kolibri-user-guide-chunks.json');
      const userGuideEmbeddingsPath = join(process.cwd(), 'data', 'kolibri-user-guide-embeddings.json');
      
      if (!existsSync(userGuideChunksPath)) {
        console.log('📚 No User Guide chunks found. Run indexing first.');
        return 0;
      }

      const userGuideChunks = JSON.parse(readFileSync(userGuideChunksPath, 'utf-8'));
      
      // Load embeddings if available
      let embeddings: { [key: string]: number[] } = {};
      if (existsSync(userGuideEmbeddingsPath)) {
        try {
          const embeddingsData = JSON.parse(readFileSync(userGuideEmbeddingsPath, 'utf-8'));
          embeddings = embeddingsData.embeddings || {};
          console.log(`🔢 Loaded ${Object.keys(embeddings).length} User Guide embeddings`);
        } catch (error) {
          console.warn('⚠️ Could not load User Guide embeddings:', error);
        }
      } else {
        console.log('⚠️ No User Guide embeddings found. Run embedding generation first for vector search.');
      }

      // Convert User Guide chunks to our DocumentChunk format
      const convertedChunks: DocumentChunk[] = userGuideChunks.map((chunk: any) => ({
        id: chunk.id,
        content: chunk.content,
        metadata: {
          source: 'kolibri-user-guide' as const,
          documentId: chunk.metadata.documentId,
          documentName: chunk.metadata.title,
          chunkIndex: chunk.metadata.chunkIndex,
          parentFolder: chunk.metadata.parentSection,
          url: chunk.metadata.url,
          section: chunk.metadata.section,
          parentSection: chunk.metadata.parentSection,
          topics: chunk.metadata.topics,
          wordCount: chunk.metadata.wordCount,
        },
      }));

      // Add User Guide chunks to existing chunks
      this.documentChunks.push(...convertedChunks);
      
      // Add embeddings to the chunkEmbeddings array
      if (Object.keys(embeddings).length > 0) {
        const userGuideEmbeddings: number[][] = [];
        for (const chunk of convertedChunks) {
          if (embeddings[chunk.id]) {
            userGuideEmbeddings.push(embeddings[chunk.id]);
          } else {
            // If no embedding found, create a placeholder (will be skipped in search)
            userGuideEmbeddings.push([]);
          }
        }
        this.chunkEmbeddings.push(...userGuideEmbeddings);
        console.log(`🔢 Added ${userGuideEmbeddings.length} User Guide embeddings to search index`);
      } else {
        // If no embeddings, add empty arrays to maintain alignment
        const emptyEmbeddings = convertedChunks.map(() => []);
        this.chunkEmbeddings.push(...emptyEmbeddings);
        console.log(`🔢 Added ${emptyEmbeddings.length} empty embeddings for User Guide chunks`);
      }
      
      console.log(`📚 Loaded ${convertedChunks.length} User Guide chunks`);
      console.log(`📊 Total chunks now: ${this.documentChunks.length} (Google Drive: ${this.documentChunks.filter(c => c.metadata.source === 'google-drive').length}, User Guide: ${convertedChunks.length})`);
      console.log(`🔢 Total embeddings now: ${this.chunkEmbeddings.length}`);
      
      return convertedChunks.length;
    } catch (error) {
      console.error('❌ Failed to load User Guide chunks:', error);
      return 0;
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
    if (this.documentChunks.length === 0) {
      throw new Error('No documents available for search.');
    }

    try {
      // Get Google Drive chunks (those with embeddings)
      const googleDriveChunks = this.documentChunks.filter(chunk => 
        chunk.metadata.source === 'google-drive' && 
        this.chunkEmbeddings[this.documentChunks.indexOf(chunk)] &&
        this.chunkEmbeddings[this.documentChunks.indexOf(chunk)].length > 0
      );
      
      // Get User Guide chunks (all User Guide chunks, regardless of embeddings)
      const userGuideChunks = this.documentChunks.filter(chunk => 
        chunk.metadata.source === 'kolibri-user-guide'
      );

      const results: SearchResult[] = [];

      // 1. Search Google Drive chunks using vector similarity (if available)
      if (googleDriveChunks.length > 0 && this.chunkEmbeddings.length > 0) {
        try {
          const { embedding: queryEmbedding } = await embed({
            model: openai.textEmbeddingModel('text-embedding-3-small'),
            value: query,
          });

          // Calculate similarity with Google Drive chunks
          const similarities = googleDriveChunks.map((chunk, index) => {
            const originalIndex = this.documentChunks.indexOf(chunk);
            const embedding = this.chunkEmbeddings[originalIndex];
            return {
              chunk,
              similarity: embedding ? cosineSimilarity(queryEmbedding, embedding) : 0,
            };
          }).filter(item => item.similarity > 0);

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

          for (let i = 0; i < Math.min(topK, similarities.length); i++) {
            const { chunk, similarity } = similarities[i];
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

          // Convert to search results
          const googleDriveResults = Array.from(documentScores.values())
            .sort((a, b) => b.totalSimilarity - a.totalSimilarity)
            .slice(0, Math.ceil(topK / 2))
            .map(doc => {
              const firstChunk = doc.chunks[0];
              const chunk = googleDriveChunks.find(c => c.metadata.documentId === doc.documentId);
              return {
                documentId: doc.documentId,
                documentName: doc.documentName,
                parentFolder: doc.parentFolder,
                content: doc.chunks.map(chunk => chunk.content).join(' '),
                similarity: doc.totalSimilarity / doc.chunks.length,
                source: 'google-drive' as const,
                url: chunk?.metadata.url,
                section: chunk?.metadata.section,
                parentSection: chunk?.metadata.parentSection,
                topics: chunk?.metadata.topics,
              };
            });
          
          results.push(...googleDriveResults);
        } catch (error) {
          console.warn('⚠️ Vector search failed, falling back to keyword search:', error);
        }
      }

      // 2. Search User Guide chunks using vector similarity (if embeddings available) or keyword matching
      if (userGuideChunks.length > 0) {
        // Check if User Guide chunks have embeddings
        const userGuideChunksWithEmbeddings = userGuideChunks.filter(chunk => {
          const chunkIndex = this.documentChunks.indexOf(chunk);
          return chunkIndex < this.chunkEmbeddings.length && 
                 this.chunkEmbeddings[chunkIndex] && 
                 this.chunkEmbeddings[chunkIndex].length > 0;
        });

        console.log(`🔍 User Guide chunks with embeddings: ${userGuideChunksWithEmbeddings.length}/${userGuideChunks.length}`);

        if (userGuideChunksWithEmbeddings.length > 0) {
          // Use vector search for User Guide chunks with embeddings
          try {
            const { embedding: queryEmbedding } = await embed({
              model: openai.textEmbeddingModel('text-embedding-3-small'),
              value: query,
            });

            const userGuideSimilarities = userGuideChunksWithEmbeddings.map(chunk => {
              const chunkIndex = this.documentChunks.indexOf(chunk);
              const embedding = this.chunkEmbeddings[chunkIndex];
              return {
                chunk,
                similarity: embedding ? cosineSimilarity(queryEmbedding, embedding) : 0,
              };
            }).filter(item => item.similarity > 0);

            // Sort by similarity and get top results
            userGuideSimilarities.sort((a, b) => b.similarity - a.similarity);
            
            const userGuideResults = userGuideSimilarities
              .slice(0, Math.ceil(topK / 2))
              .map(item => ({
                documentId: item.chunk.metadata.documentId,
                documentName: item.chunk.metadata.documentName,
                parentFolder: item.chunk.metadata.parentSection || 'Kolibri User Guide',
                content: item.chunk.content,
                similarity: item.similarity,
                source: 'kolibri-user-guide' as const,
                url: item.chunk.metadata.url,
                section: item.chunk.metadata.section,
                parentSection: item.chunk.metadata.parentSection,
                topics: item.chunk.metadata.topics,
              }));
            
            results.push(...userGuideResults);
            console.log(`🔍 Vector search found ${userGuideResults.length} relevant User Guide chunks`);
          } catch (error) {
            console.warn('⚠️ User Guide vector search failed, falling back to keyword search:', error);
            // Fall through to keyword search
          }
        }

        // Fallback to keyword search for chunks without embeddings or if vector search failed
        const chunksNeedingKeywordSearch = userGuideChunks.filter(chunk => {
          const chunkIndex = this.documentChunks.indexOf(chunk);
          return chunkIndex >= this.chunkEmbeddings.length || 
                 !this.chunkEmbeddings[chunkIndex] || 
                 this.chunkEmbeddings[chunkIndex].length === 0;
        });

        if (chunksNeedingKeywordSearch.length > 0) {
          const queryLower = query.toLowerCase();
          const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
          
          const userGuideKeywordResults = chunksNeedingKeywordSearch
            .map(chunk => {
              const contentLower = chunk.content.toLowerCase();
              const titleLower = chunk.metadata.documentName.toLowerCase();
              const topicsLower = chunk.metadata.topics?.map(t => t.toLowerCase()) || [];
              
              // Calculate keyword relevance score
              let score = 0;
              queryWords.forEach(word => {
                if (contentLower.includes(word)) score += 2;
                if (titleLower.includes(word)) score += 3;
                if (topicsLower.some(topic => topic.includes(word))) score += 2;
              });
              
              return { chunk, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, Math.ceil(topK / 2))
            .map(item => ({
              documentId: item.chunk.metadata.documentId,
              documentName: item.chunk.metadata.documentName,
              parentFolder: item.chunk.metadata.parentSection || 'Kolibri User Guide',
              content: item.chunk.content,
              similarity: item.score / 10, // Normalize score to 0-1 range
              source: 'kolibri-user-guide' as const,
              url: item.chunk.metadata.url,
              section: item.chunk.metadata.section,
              parentSection: item.chunk.metadata.parentSection,
              topics: item.chunk.metadata.topics,
            }));
          
          results.push(...userGuideKeywordResults);
          console.log(`🔍 Keyword search found ${userGuideKeywordResults.length} relevant User Guide chunks`);
        }
      }

      // Sort all results by similarity and return top K
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, topK);
      
    } catch (error) {
      console.error('❌ Failed to search documents:', error);
      throw error;
    }
  }

  /**
   * Get indexing status
   */
  getIndexingStatus() {
    const googleDriveChunks = this.documentChunks.filter(chunk => chunk.metadata.source === 'google-drive');
    const userGuideChunks = this.documentChunks.filter(chunk => chunk.metadata.source === 'kolibri-user-guide');
    
    return {
      isIndexed: this.isIndexed,
      totalChunks: this.documentChunks.length,
      totalEmbeddings: this.chunkEmbeddings.length,
      indexFilePath: this.indexFilePath,
      lastIndexed: this.isIndexed ? new Date().toISOString() : null,
      sourceBreakdown: {
        googleDrive: googleDriveChunks.length,
        userGuide: userGuideChunks.length,
      },
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
