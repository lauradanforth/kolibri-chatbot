#!/usr/bin/env node

import { kolibriEmbeddingGenerator } from '../lib/kolibri-embedding-generator';

async function generateEmbeddings(): Promise<void> {
  console.log('🚀 Starting User Guide Embedding Generation...\n');
  
  try {
    // Show processing configuration
    const stats = kolibriEmbeddingGenerator.getProcessingStats();
    console.log('⚙️  Processing Configuration:');
    console.log(`   • Max concurrent batches: ${stats.maxConcurrentBatches}`);
    console.log(`   • Batch size: ${stats.batchSize} chunks`);
    console.log(`   • Rate limit delay: ${stats.rateLimitDelay}ms between batch groups`);
    console.log(`   • Estimated time for 433 chunks: ${(stats.estimatedTimeForChunks(433) / 1000 / 60).toFixed(1)} minutes\n`);
    
    // Start embedding generation
    const result = await kolibriEmbeddingGenerator.generateEmbeddingsForUserGuide();
    
    console.log('\n🎉 Embedding Generation Completed Successfully!');
    console.log('=' .repeat(60));
    console.log(`📊 Final Results:`);
    console.log(`   • Total chunks processed: ${result.totalChunks}`);
    console.log(`   • Successful embeddings: ${result.successfulEmbeddings}`);
    console.log(`   • Failed embeddings: ${result.failedEmbeddings}`);
    console.log(`   • Success rate: ${((result.successfulEmbeddings / result.totalChunks) * 100).toFixed(1)}%`);
    console.log(`   • Total processing time: ${(result.processingTime / 1000 / 60).toFixed(1)} minutes`);
    console.log(`   • Average speed: ${(result.successfulEmbeddings / (result.processingTime / 1000)).toFixed(2)} embeddings/second`);
    console.log('=' .repeat(60));
    
    if (result.failedEmbeddings > 0) {
      console.log('\n⚠️  Some embeddings failed. You may want to retry the failed chunks.');
    }
    
    console.log('\n🚀 Next Steps:');
    console.log('  1. Embeddings saved to data/kolibri-user-guide-embeddings.json');
    console.log('  2. Restart your application to load the new embeddings');
    console.log('  3. Test vector search with User Guide content');
    
  } catch (error) {
    console.error('\n❌ Embedding generation failed:', error);
    process.exit(1);
  }
}

// Run the embedding generation if this script is executed directly
if (require.main === module) {
  generateEmbeddings().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { generateEmbeddings };
