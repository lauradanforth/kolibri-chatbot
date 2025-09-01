import axios from 'axios';
import * as cheerio from 'cheerio';

export interface KolibriDocSection {
  id: string;
  title: string;
  url: string;
  content: string;
  parentSection: string;
  metadata: {
    lastUpdated: string;
    wordCount: number;
    topics: string[];
  };
}

export interface KolibriDocPage {
  url: string;
  title: string;
  content: string;
  sections: string[];
}

export class KolibriDocsScraper {
  private baseUrl: string;
  private scrapeDelay: number;
  private maxPages: number;
  private visitedUrls: Set<string> = new Set();

  constructor(
    baseUrl: string = 'https://kolibri.readthedocs.io/en/latest/',
    scrapeDelay: number = 1000,
    maxPages: number = 50
  ) {
    this.baseUrl = baseUrl;
    this.scrapeDelay = scrapeDelay;
    this.maxPages = maxPages;
  }

  /**
   * Discover all available documentation pages
   */
  async discoverPages(): Promise<string[]> {
    try {
      console.log(`🔍 Discovering pages from ${this.baseUrl}`);
      
      const response = await axios.get(this.baseUrl);
      const $ = cheerio.load(response.data);
      
      const pageUrls: string[] = [];
      
      // Find all toctree navigation links (both L1 and L2)
      $('.toctree-l1 a, .toctree-l2 a').each((_, element) => {
        const href = $(element).attr('href');
        if (href && !href.includes('#') && !href.includes('javascript:')) {
          let fullUrl: string;
          
          if (href.startsWith('http')) {
            fullUrl = href;
          } else if (href.startsWith('/')) {
            fullUrl = `https://kolibri.readthedocs.io${href}`;
          } else {
            fullUrl = new URL(href, this.baseUrl).href;
          }
          
          if (!pageUrls.includes(fullUrl)) {
            pageUrls.push(fullUrl);
          }
        }
      });

      // Also check for any other internal links
      $('a[href^="/en/latest/"]').each((_, element) => {
        const href = $(element).attr('href');
        if (href && !href.includes('#') && !href.includes('javascript:')) {
          const fullUrl = `https://kolibri.readthedocs.io${href}`;
          if (!pageUrls.includes(fullUrl)) {
            pageUrls.push(fullUrl);
          }
        }
      });

      console.log(`📚 Found ${pageUrls.length} potential pages`);
      return pageUrls.slice(0, this.maxPages); // Limit to max pages
    } catch (error) {
      console.error('❌ Error discovering pages:', error);
      return [];
    }
  }

  /**
   * Scrape a single documentation page
   */
  async scrapePage(url: string): Promise<KolibriDocPage | null> {
    if (this.visitedUrls.has(url)) {
      return null;
    }

    try {
      console.log(`📄 Scraping: ${url}`);
      
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // Extract title
      const title = $('h1').first().text().trim() || 
                   $('title').text().trim() || 
                   'Untitled';
      
      // Extract main content (focus on the main content area)
      let content = '';
      
      // Try to find the main content area
      const mainContent = $('.document, .content, main, article, .section').first();
      if (mainContent.length > 0) {
        content = this.extractCleanText(mainContent);
      } else {
        // Fallback to body content
        content = this.extractCleanText($('body'));
      }
      
      // Extract section headers for navigation
      const sections: string[] = [];
      $('h1, h2, h3').each((_, element) => {
        const sectionText = $(element).text().trim();
        if (sectionText && sectionText.length > 3) {
          sections.push(sectionText);
        }
      });
      
      this.visitedUrls.add(url);
      
      // Rate limiting
      await this.delay(this.scrapeDelay);
      
      return {
        url,
        title,
        content,
        sections
      };
    } catch (error) {
      console.error(`❌ Error scraping ${url}:`, error);
      return null;
    }
  }

  /**
   * Extract clean text content from HTML
   */
  private extractCleanText(element: cheerio.Cheerio<any>): string {
    // Remove navigation, headers, footers, and other non-content elements
    element.find('nav, header, footer, .navigation, .sidebar, .toc, script, style').remove();
    
    // Get text content
    let text = element.text();
    
    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    return text;
  }

  /**
   * Scrape all discovered pages
   */
  async scrapeAllPages(): Promise<KolibriDocPage[]> {
    const urls = await this.discoverPages();
    const pages: KolibriDocPage[] = [];
    
    console.log(`🚀 Starting to scrape ${urls.length} pages...`);
    
    for (const url of urls) {
      const page = await this.scrapePage(url);
      if (page && page.content.length > 100) { // Only keep pages with substantial content
        pages.push(page);
        console.log(`✅ Scraped: ${page.title} (${page.content.length} chars)`);
      }
    }
    
    console.log(`🎉 Completed scraping ${pages.length} pages`);
    return pages;
  }

  /**
   * Delay function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the main index page structure
   */
  async getIndexStructure(): Promise<{ [key: string]: string[] }> {
    try {
      const response = await axios.get(this.baseUrl);
      const $ = cheerio.load(response.data);
      
      const structure: { [key: string]: string[] } = {};
      
      // Parse the navigation structure
      $('.toctree-wrapper').each((_, element) => {
        const $nav = $(element);
        const sectionTitle = $nav.find('> .toctree-l1 > a').text().trim();
        
        if (sectionTitle) {
          const subsections: string[] = [];
          $nav.find('.toctree-l2 > a').each((_, subElement) => {
            const subsection = $(subElement).text().trim();
            if (subsection) {
              subsections.push(subsection);
            }
          });
          
          structure[sectionTitle] = subsections;
        }
      });
      
      return structure;
    } catch (error) {
      console.error('❌ Error getting index structure:', error);
      return {};
    }
  }
}

// Export a default instance
export const kolibriDocsScraper = new KolibriDocsScraper();
