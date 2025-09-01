import { KolibriDocPage, KolibriDocSection } from './kolibri-docs-scraper';

export interface ProcessedChunk {
  id: string;
  content: string;
  metadata: {
    source: 'kolibri-user-guide';
    documentId: string;
    section: string;
    url: string;
    title: string;
    parentSection?: string;
    chunkIndex: number;
    totalChunks: number;
    topics: string[];
    wordCount: number;
  };
}

export class KolibriDocsProcessor {
  private chunkSize: number;
  private overlapSize: number;

  constructor(chunkSize: number = 1500, overlapSize: number = 200) {
    this.chunkSize = chunkSize;
    this.overlapSize = overlapSize;
  }

  /**
   * Delay function for processing control
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process scraped pages into searchable chunks
   */
  async processPages(pages: KolibriDocPage[]): Promise<ProcessedChunk[]> {
    console.log(`🔧 Processing ${pages.length} pages into chunks...`);
    
    const allChunks: ProcessedChunk[] = [];
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      console.log(`📄 Processing ${i + 1}/${pages.length}: ${page.title}`);
      
      try {
        const pageChunks = this.chunkPage(page);
        allChunks.push(...pageChunks);
        
        console.log(`  ✅ Created ${pageChunks.length} chunks (${page.content.length.toLocaleString()} chars)`);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        // Add small delay to prevent overwhelming the system
        await this.delay(100);
        
      } catch (error) {
        console.error(`  ❌ Error processing ${page.title}:`, error);
        // Continue with next page
      }
    }
    
    console.log(`🎯 Total chunks created: ${allChunks.length}`);
    return allChunks;
  }

  /**
   * Chunk a single page into searchable segments
   */
  private chunkPage(page: KolibriDocPage): ProcessedChunk[] {
    const chunks: ProcessedChunk[] = [];
    const content = page.content;
    
    if (content.length <= this.chunkSize) {
      // Page is small enough to be one chunk
      chunks.push(this.createChunk(page, content, 0, 1));
      return chunks;
    }
    
    // Split content into overlapping chunks with better memory management
    let startIndex = 0;
    let chunkIndex = 0;
    const maxChunks = Math.ceil(content.length / (this.chunkSize - this.overlapSize)) + 10; // Safety limit
    
    while (startIndex < content.length && chunkIndex < maxChunks) {
      const endIndex = Math.min(startIndex + this.chunkSize, content.length);
      
      // Try to break at sentence boundaries
      const chunkContent = this.getChunkContent(content, startIndex, endIndex);
      
      if (chunkContent.trim().length > 50) { // Only create chunks with substantial content
        chunks.push(this.createChunk(page, chunkContent, chunkIndex, 0));
        chunkIndex++;
      }
      
      startIndex = endIndex - this.overlapSize;
      
      // Prevent infinite loops
      if (startIndex >= content.length - 100) {
        break;
      }
    }
    
    // Update total chunks count
    chunks.forEach((chunk, index) => {
      chunk.metadata.totalChunks = chunks.length;
      chunk.metadata.chunkIndex = index;
    });
    
    return chunks;
  }

  /**
   * Get chunk content with smart boundary detection
   */
  private getChunkContent(content: string, startIndex: number, endIndex: number): string {
    let chunkContent = content.substring(startIndex, endIndex);
    
    // Try to break at sentence boundaries
    if (endIndex < content.length) {
      const nextSentenceStart = content.indexOf('. ', endIndex);
      if (nextSentenceStart !== -1 && nextSentenceStart < endIndex + 100) {
        // Extend to include the complete sentence
        chunkContent = content.substring(startIndex, nextSentenceStart + 1);
      }
    }
    
    return chunkContent.trim();
  }

  /**
   * Create a chunk with metadata
   */
  private createChunk(page: KolibriDocPage, content: string, chunkIndex: number, totalChunks: number): ProcessedChunk {
    const chunkId = `${this.sanitizeId(page.title)}-chunk-${chunkIndex}`;
    
    // Extract topics from sections and content
    const topics = this.extractTopics(page.sections, content);
    
    // Determine parent section from URL or title
    const parentSection = this.determineParentSection(page.url, page.title);
    
    return {
      id: chunkId,
      content,
      metadata: {
        source: 'kolibri-user-guide',
        documentId: this.sanitizeId(page.title),
        section: page.title,
        url: page.url,
        title: page.title,
        parentSection,
        chunkIndex,
        totalChunks: totalChunks || 1,
        topics,
        wordCount: this.countWords(content)
      }
    };
  }

  /**
   * Extract topics from sections and content
   */
  private extractTopics(sections: string[], content: string): string[] {
    const topics = new Set<string>();
    
    // Add section headers as topics
    sections.forEach(section => {
      if (section.length > 3 && section.length < 100) {
        topics.add(section.toLowerCase());
      }
    });
    
    // Extract key terms from content (simple approach)
    const words = content.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4)
      .filter(word => /^[a-z]+$/.test(word));
    
    // Add common technical terms
    const technicalTerms = [
      'kolibri', 'installation', 'setup', 'configuration', 'management',
      'users', 'classes', 'facilities', 'channels', 'resources', 'permissions',
      'command', 'line', 'performance', 'troubleshooting', 'network',
      'windows', 'linux', 'macos', 'android', 'raspberry', 'debian', 'ubuntu'
    ];
    
    technicalTerms.forEach(term => {
      if (content.toLowerCase().includes(term)) {
        topics.add(term);
      }
    });
    
    return Array.from(topics).slice(0, 10); // Limit to 10 topics
  }

  /**
   * Determine parent section from URL or title
   */
  private determineParentSection(url: string, title: string): string | undefined {
    // Extract section from URL path
    const urlMatch = url.match(/\/en\/latest\/([^\/]+)/);
    if (urlMatch) {
      return urlMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Try to infer from title
    const titleLower = title.toLowerCase();
    if (titleLower.includes('install') || titleLower.includes('setup')) {
      return 'Install Kolibri';
    } else if (titleLower.includes('access') || titleLower.includes('connect')) {
      return 'Access Kolibri';
    } else if (titleLower.includes('manage') || titleLower.includes('admin')) {
      return 'Manage Kolibri';
    } else if (titleLower.includes('advanced') || titleLower.includes('command')) {
      return 'Advanced Management';
    } else if (titleLower.includes('coach') || titleLower.includes('learn')) {
      return 'Coach your learners';
    }
    
    return undefined;
  }

  /**
   * Sanitize ID for use in chunk identifiers
   */
  private sanitizeId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Validate processed chunks
   */
  validateChunks(chunks: ProcessedChunk[]): { valid: ProcessedChunk[], invalid: ProcessedChunk[] } {
    const valid: ProcessedChunk[] = [];
    const invalid: ProcessedChunk[] = [];
    
    chunks.forEach(chunk => {
      if (this.isValidChunk(chunk)) {
        valid.push(chunk);
      } else {
        invalid.push(chunk);
      }
    });
    
    console.log(`✅ Valid chunks: ${valid.length}`);
    console.log(`❌ Invalid chunks: ${invalid.length}`);
    
    return { valid, invalid };
  }

  /**
   * Check if a chunk is valid
   */
  private isValidChunk(chunk: ProcessedChunk): boolean {
    return (
      chunk.content.length >= 100 &&
      chunk.content.length <= 5000 &&
      chunk.metadata.title.length > 0 &&
      chunk.metadata.url.length > 0 &&
      chunk.metadata.topics.length > 0
    );
  }

  /**
   * Get chunk statistics
   */
  getChunkStats(chunks: ProcessedChunk[]): {
    totalChunks: number;
    averageChunkSize: number;
    totalContent: number;
    sourceBreakdown: { [key: string]: number };
  } {
    const totalChunks = chunks.length;
    const totalContent = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
    const averageChunkSize = totalChunks > 0 ? totalContent / totalChunks : 0;
    
    const sourceBreakdown = chunks.reduce((acc, chunk) => {
      const source = chunk.metadata.source;
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    return {
      totalChunks,
      averageChunkSize: Math.round(averageChunkSize),
      totalContent,
      sourceBreakdown
    };
  }
}

// Export a default instance
export const kolibriDocsProcessor = new KolibriDocsProcessor();
