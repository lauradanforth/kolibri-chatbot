#!/usr/bin/env node

import { kolibriDocsScraper } from '../lib/kolibri-docs-scraper';
import { kolibriDocsProcessor } from '../lib/kolibri-docs-processor';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface IndexingResult {
  timestamp: string;
  totalPages: number;
  totalChunks: number;
  stats: {
    totalChunks: number;
    averageChunkSize: number;
    totalContent: number;
    sourceBreakdown: { [key: string]: number };
  };
  pages: Array<{
    title: string;
    url: string;
    contentLength: number;
    chunks: number;
  }>;
}

async function indexUserGuide(): Promise<void> {
  console.log('🚀 Starting Kolibri User Guide indexing...\n');
  
  try {
    // Step 1: Discover and scrape pages
    console.log('📚 Step 1: Discovering documentation pages...');
    const pages = await kolibriDocsScraper.scrapeAllPages();
    
    if (pages.length === 0) {
      console.error('❌ No pages were scraped. Exiting.');
      return;
    }
    
    console.log(`✅ Successfully scraped ${pages.length} pages\n`);
    
    // Step 2: Process pages into chunks
    console.log('🔧 Step 2: Processing pages into searchable chunks...');
    const chunks = await kolibriDocsProcessor.processPages(pages);
    
    if (chunks.length === 0) {
      console.error('❌ No chunks were created. Exiting.');
      return;
    }
    
    console.log(`✅ Successfully created ${chunks.length} chunks\n`);
    
    // Step 3: Validate chunks
    console.log('✅ Step 3: Validating chunks...');
    const { valid, invalid } = kolibriDocsProcessor.validateChunks(chunks);
    
    if (valid.length === 0) {
      console.error('❌ No valid chunks found. Exiting.');
      return;
    }
    
    console.log(`✅ Validation complete: ${valid.length} valid, ${invalid.length} invalid chunks\n`);
    
    // Step 4: Generate statistics
    console.log('📊 Step 4: Generating indexing statistics...');
    const stats = kolibriDocsProcessor.getChunkStats(valid);
    
    // Step 5: Create indexing result
    const result: IndexingResult = {
      timestamp: new Date().toISOString(),
      totalPages: pages.length,
      totalChunks: valid.length,
      stats,
      pages: pages.map(page => ({
        title: page.title,
        url: page.url,
        contentLength: page.content.length,
        chunks: chunks.filter(chunk => chunk.metadata.documentId === kolibriDocsProcessor['sanitizeId'](page.title)).length
      }))
    };
    
    // Step 6: Save results
    console.log('💾 Step 5: Saving indexing results...');
    
    // Save chunks to JSON file
    const chunksPath = join(process.cwd(), 'data', 'kolibri-user-guide-chunks.json');
    writeFileSync(chunksPath, JSON.stringify(valid, null, 2));
    console.log(`✅ Saved ${valid.length} chunks to ${chunksPath}`);
    
    // Save indexing result
    const resultPath = join(process.cwd(), 'data', 'kolibri-user-guide-index.json');
    writeFileSync(resultPath, JSON.stringify(result, null, 2));
    console.log(`✅ Saved indexing result to ${resultPath}`);
    
    // Step 7: Display summary
    console.log('\n🎉 Indexing completed successfully!');
    console.log('=' .repeat(50));
    console.log(`📚 Total pages indexed: ${result.totalPages}`);
    console.log(`🎯 Total chunks created: ${result.totalChunks}`);
    console.log(`📝 Total content: ${result.stats.totalContent.toLocaleString()} characters`);
    console.log(`📊 Average chunk size: ${result.stats.averageChunkSize} characters`);
    console.log(`⏰ Indexed at: ${result.timestamp}`);
    console.log('=' .repeat(50));
    
    // Display page breakdown
    console.log('\n📄 Page breakdown:');
    result.pages.forEach(page => {
      console.log(`  • ${page.title}: ${page.chunks} chunks (${page.contentLength.toLocaleString()} chars)`);
    });
    
    console.log('\n🚀 Next steps:');
    console.log('  1. Review the generated chunks in data/kolibri-user-guide-chunks.json');
    console.log('  2. Integrate chunks with your vector search system');
    console.log('  3. Test search functionality with the new User Guide content');
    
  } catch (error) {
    console.error('❌ Indexing failed:', error);
    process.exit(1);
  }
}

// Run the indexing if this script is executed directly
if (require.main === module) {
  indexUserGuide().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { indexUserGuide, IndexingResult };
