#!/usr/bin/env node

import { indexUserGuide } from './index-user-guide';
import { generateEmbeddings } from './generate-embeddings';

async function setupUserGuideVectorSearch(): Promise<void> {
  console.log('🚀 Setting up User Guide Vector Search...\n');
  
  try {
    // Step 1: Index the User Guide
    console.log('📚 Step 1: Indexing User Guide content...');
    await indexUserGuide();
    console.log('✅ Indexing completed successfully!\n');
    
    // Step 2: Generate embeddings
    console.log('🔢 Step 2: Generating embeddings for vector search...');
    await generateEmbeddings();
    console.log('✅ Embedding generation completed successfully!\n');
    
    console.log('🎉 User Guide Vector Search setup completed!');
    console.log('=' .repeat(60));
    console.log('📊 Summary:');
    console.log('   • User Guide content indexed and chunked');
    console.log('   • Vector embeddings generated for semantic search');
    console.log('   • Ready for enhanced search capabilities');
    console.log('=' .repeat(60));
    
    console.log('\n🚀 Next Steps:');
    console.log('  1. Restart your application to load the new embeddings');
    console.log('  2. Test vector search with queries like:');
    console.log('     • "How do I install Kolibri on Windows?"');
    console.log('     • "What are the user roles in Kolibri?"');
    console.log('     • "How do I create lessons for students?"');
    console.log('  3. Monitor search quality and performance');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupUserGuideVectorSearch().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { setupUserGuideVectorSearch };
