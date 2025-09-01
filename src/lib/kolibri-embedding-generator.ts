import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ProcessedChunk } from './kolibri-docs-processor';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

interface EmbeddingResult {
  chunkId: string;
  embedding: number[];
  success: boolean;
  error?: string;
}

interface BatchProcessingResult {
  batchIndex: number;
  results: EmbeddingResult[];
  processingTime: number;
}

export class KolibriEmbeddingGenerator {
  private maxConcurrentBatches: number;
  private batchSize: number;
  private rateLimitDelay: number;
  private maxRetries: number;

  constructor(
    maxConcurrentBatches: number = 3,
    batchSize: number = 20,
    rateLimitDelay: number = 1000,
    maxRetries: number = 3
  ) {
    this.maxConcurrentBatches = maxConcurrentBatches;
    this.batchSize = batchSize;
    this.rateLimitDelay = rateLimitDelay;
    this.maxRetries = maxRetries;
  }

  /**
   * Generate embeddings for User Guide chunks using parallel processing
   */
  async generateEmbeddingsForUserGuide(): Promise<{
    totalChunks: number;
    successfulEmbeddings: number;
    failedEmbeddings: number;
    embeddings: Map<string, number[]>;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Load User Guide chunks
      const chunks = this.loadUserGuideChunks();
      if (chunks.length === 0) {
        throw new Error('No User Guide chunks found. Run indexing first.');
      }

      console.log(`🚀 Starting parallel embedding generation for ${chunks.length} chunks...`);
      console.log(`⚙️  Configuration: ${this.maxConcurrentBatches} concurrent batches, ${this.batchSize} chunks per batch`);

      // Split chunks into batches
      const batches = this.createBatches(chunks);
      console.log(`📦 Created ${batches.length} batches for processing`);

      // Process batches in parallel with controlled concurrency
      const allResults: EmbeddingResult[] = [];
      const embeddings = new Map<string, number[]>();

      for (let i = 0; i < batches.length; i += this.maxConcurrentBatches) {
        const currentBatchGroup = batches.slice(i, i + this.maxConcurrentBatches);
        
        console.log(`🔄 Processing batch group ${Math.floor(i / this.maxConcurrentBatches) + 1}/${Math.ceil(batches.length / this.maxConcurrentBatches)}`);
        
        // Process current batch group in parallel
        const batchPromises = currentBatchGroup.map((batch, batchIndex) => 
          this.processBatch(batch, i + batchIndex)
        );

        const batchResults = await Promise.all(batchPromises);
        
        // Collect results
        batchResults.forEach(batchResult => {
          allResults.push(...batchResult.results);
          
          // Add successful embeddings to map
          batchResult.results.forEach(result => {
            if (result.success && result.embedding) {
              embeddings.set(result.chunkId, result.embedding);
            }
          });
        });

        // Rate limiting between batch groups
        if (i + this.maxConcurrentBatches < batches.length) {
          console.log(`⏳ Rate limiting: waiting ${this.rateLimitDelay}ms before next batch group...`);
          await this.delay(this.rateLimitDelay);
        }
      }

      // Calculate statistics
      const successfulEmbeddings = allResults.filter(r => r.success).length;
      const failedEmbeddings = allResults.filter(r => !r.success).length;
      const processingTime = Date.now() - startTime;

      console.log(`✅ Embedding generation completed!`);
      console.log(`📊 Results: ${successfulEmbeddings} successful, ${failedEmbeddings} failed`);
      console.log(`⏱️  Total processing time: ${(processingTime / 1000).toFixed(2)}s`);
      console.log(`🚀 Average speed: ${(successfulEmbeddings / (processingTime / 1000)).toFixed(2)} embeddings/second`);

      // Save embeddings to file
      this.saveEmbeddings(embeddings, chunks.length);

      return {
        totalChunks: chunks.length,
        successfulEmbeddings,
        failedEmbeddings,
        embeddings,
        processingTime
      };

    } catch (error) {
      console.error('❌ Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Process a single batch of chunks
   */
  private async processBatch(chunks: ProcessedChunk[], batchIndex: number): Promise<BatchProcessingResult> {
    const batchStartTime = Date.now();
    
    try {
      console.log(`  📦 Processing batch ${batchIndex + 1}: ${chunks.length} chunks`);
      
      const chunkContents = chunks.map(chunk => chunk.content);
      
      // Generate embeddings for this batch
      const { embeddings } = await embedMany({
        model: openai.textEmbeddingModel('text-embedding-3-small'),
        values: chunkContents,
        maxParallelCalls: 5, // Allow some parallelization within the batch
      });

      // Create results
      const results: EmbeddingResult[] = chunks.map((chunk, index) => ({
        chunkId: chunk.id,
        embedding: embeddings[index],
        success: true
      }));

      const processingTime = Date.now() - batchStartTime;
      console.log(`    ✅ Batch ${batchIndex + 1} completed in ${processingTime}ms`);

      return {
        batchIndex,
        results,
        processingTime
      };

    } catch (error) {
      console.error(`    ❌ Batch ${batchIndex + 1} failed:`, error);
      
      // Return failed results for this batch
      const results: EmbeddingResult[] = chunks.map(chunk => ({
        chunkId: chunk.id,
        embedding: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));

      const processingTime = Date.now() - batchStartTime;
      return {
        batchIndex,
        results,
        processingTime
      };
    }
  }

  /**
   * Create batches from chunks
   */
  private createBatches(chunks: ProcessedChunk[]): ProcessedChunk[][] {
    const batches: ProcessedChunk[][] = [];
    
    for (let i = 0; i < chunks.length; i += this.batchSize) {
      const batch = chunks.slice(i, i + this.batchSize);
      batches.push(batch);
    }
    
    return batches;
  }

  /**
   * Load User Guide chunks from file
   */
  private loadUserGuideChunks(): ProcessedChunk[] {
    try {
      const chunksPath = join(process.cwd(), 'data', 'kolibri-user-guide-chunks.json');
      
      if (!existsSync(chunksPath)) {
        console.error('❌ User Guide chunks file not found. Run indexing first.');
        return [];
      }

      const chunksData = JSON.parse(readFileSync(chunksPath, 'utf-8'));
      console.log(`📚 Loaded ${chunksData.length} User Guide chunks from file`);
      
      return chunksData;
    } catch (error) {
      console.error('❌ Failed to load User Guide chunks:', error);
      return [];
    }
  }

  /**
   * Save embeddings to file
   */
  private saveEmbeddings(embeddings: Map<string, number[]>, totalChunks: number): void {
    try {
      const embeddingsPath = join(process.cwd(), 'data', 'kolibri-user-guide-embeddings.json');
      
      const embeddingsData = {
        metadata: {
          totalChunks,
          successfulEmbeddings: embeddings.size,
          generatedAt: new Date().toISOString(),
          model: 'text-embedding-3-small',
          embeddingDimensions: embeddings.size > 0 ? embeddings.values().next().value.length : 0
        },
        embeddings: Object.fromEntries(embeddings)
      };

      writeFileSync(embeddingsPath, JSON.stringify(embeddingsData, null, 2));
      console.log(`💾 Saved ${embeddings.size} embeddings to ${embeddingsPath}`);
      
    } catch (error) {
      console.error('❌ Failed to save embeddings:', error);
    }
  }

  /**
   * Delay function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    maxConcurrentBatches: number;
    batchSize: number;
    rateLimitDelay: number;
    estimatedTimeForChunks: (chunkCount: number) => number;
  } {
    return {
      maxConcurrentBatches: this.maxConcurrentBatches,
      batchSize: this.batchSize,
      rateLimitDelay: this.rateLimitDelay,
      estimatedTimeForChunks: (chunkCount: number) => {
        const batches = Math.ceil(chunkCount / this.batchSize);
        const batchGroups = Math.ceil(batches / this.maxConcurrentBatches);
        const estimatedTimePerBatch = 2000; // 2 seconds per batch (conservative estimate)
        const totalBatchTime = batches * estimatedTimePerBatch;
        const totalRateLimitTime = (batchGroups - 1) * this.rateLimitDelay;
        return totalBatchTime + totalRateLimitTime;
      }
    };
  }
}

// Export a default instance with optimized settings
export const kolibriEmbeddingGenerator = new KolibriEmbeddingGenerator(
  3,    // 3 concurrent batches
  20,   // 20 chunks per batch
  1000, // 1 second delay between batch groups
  3     // 3 retries per batch
);
