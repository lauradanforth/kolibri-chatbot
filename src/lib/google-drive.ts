import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

import { aiSDKVectorSearchService } from './ai-sdk-vector-search';

// Google Drive API configuration
const FOLDER_ID = '11OBGEVcpY_e3wkWIbYf51yZiAz_-JIsV';

export interface DriveDocument {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  content?: string;
  parentFolder?: string;
  relevanceScore?: number; // Added for content-based search
}

export class GoogleDriveService {
  private drive: any;
  private docs: any;
  private documentCache: Map<string, string> = new Map();

  constructor() {
    // Use service account authentication with the JSON key file
    const auth = new GoogleAuth({
      keyFile: './learninge-291168aade81.json',
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/documents.readonly'
      ],
    });

    this.drive = google.drive({
      version: 'v3',
      auth,
    });

    this.docs = google.docs({
      version: 'v1',
      auth,
    });
  }

  async listDocuments(): Promise<DriveDocument[]> {
    try {
      return await this.listDocumentsRecursive(FOLDER_ID, '');
    } catch (error: any) {
      console.error('Error listing documents:', error.message);
      throw new Error(`Failed to list documents from Google Drive: ${error.message}`);
    }
  }

  private async listDocumentsRecursive(folderId: string, parentPath: string): Promise<DriveDocument[]> {
    const allDocuments: DriveDocument[] = [];
    
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType,webViewLink)',
        orderBy: 'name',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files = response.data.files || [];
      
      for (const file of files) {
        const currentPath = parentPath ? `${parentPath}/${file.name}` : file.name;
        
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          // Recursively search subfolders
          const subfolderDocs = await this.listDocumentsRecursive(file.id, currentPath);
          allDocuments.push(...subfolderDocs);
        } else {
          // Add document with parent folder information
          allDocuments.push({
            ...file,
            parentFolder: parentPath || 'Root Folder'
          });
        }
      }
      
      return allDocuments;
    } catch (error: any) {
      console.error(`Error listing documents in folder ${folderId}:`, error.message);
      return [];
    }
  }

  async getDocumentContent(fileId: string, mimeType: string): Promise<string> {
    // Check cache first
    if (this.documentCache.has(fileId)) {
      return this.documentCache.get(fileId)!;
    }

    try {
      let content = '';
      
      // Handle Google Docs differently
      if (mimeType === 'application/vnd.google-apps.document') {
        const response = await this.docs.documents.get({
          documentId: fileId,
        });
        
        // Extract text content from the document
        const docContent = response.data.body?.content || [];
        
        for (const element of docContent) {
          if (element.paragraph) {
            for (const textElement of element.paragraph.elements || []) {
              if (textElement.textRun) {
                content += textElement.textRun.content || '';
              }
            }
          }
        }
      } else {
        // For other file types, try to get content as text
        const response = await this.drive.files.get({
          fileId,
          alt: 'media',
        }, { responseType: 'text' });

        content = response.data;
      }

      // Cache the content
      this.documentCache.set(fileId, content);
      return content;
    } catch (error: any) {
      console.error(`Error getting document content for ${fileId}:`, error.message);
      const errorMessage = `[Document content not accessible: ${error.message}]`;
      this.documentCache.set(fileId, errorMessage);
      return errorMessage;
    }
  }

  async searchDocuments(query: string): Promise<DriveDocument[]> {
    try {
      // First, get all documents in the folder (including subfolders)
      const documents = await this.listDocuments();
      const results: DriveDocument[] = [];

      // For each document, check if it matches the query
      for (const doc of documents) {
        const docNameLower = doc.name.toLowerCase();
        const queryLower = query.toLowerCase();
        
        // Get document content for content-based search
        const content = await this.getDocumentContent(doc.id, doc.mimeType);
        const contentLower = content.toLowerCase();
        
        // Check if query matches document name OR content
        const queryWords = queryLower.split(/\s+/);
        const nameMatches = queryWords.some(word => 
          word.length > 2 && docNameLower.includes(word)
        ) || docNameLower.includes(queryLower);
        
        const contentMatches = queryWords.some(word => 
          word.length > 2 && contentLower.includes(word)
        ) || contentLower.includes(queryLower);

        if (nameMatches || contentMatches) {
          // Calculate relevance score
          const relevanceScore = this.calculateRelevanceScore(queryLower, docNameLower, contentLower);
          
          results.push({
            ...doc,
            content: content.substring(0, 2000), // Limit content for performance
            relevanceScore
          });
        }
      }

      // Sort by relevance score (highest first)
      results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      return results;
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  private calculateRelevanceScore(query: string, docName: string, content: string): number {
    let score = 0;
    const queryWords = query.split(/\s+/).filter(word => word.length > 2);
    
    // Name matching gets higher weight
    for (const word of queryWords) {
      if (docName.includes(word)) {
        score += 10; // High weight for name matches
      }
      if (content.includes(word)) {
        score += 1; // Lower weight for content matches
      }
    }
    
    // Bonus for exact phrase matches
    if (docName.includes(query)) {
      score += 20;
    }
    if (content.includes(query)) {
      score += 5;
    }
    
    // Bonus for title matches
    if (docName.toLowerCase().includes(query.toLowerCase())) {
      score += 15;
    }
    
    return score;
  }

  /**
   * Index all documents in the vector database for semantic search
   */
  async indexDocumentsForVectorSearch() {
    try {
      console.log('🔄 Indexing documents for vector search...');
      
      const documents = await this.listDocuments();
      const documentsWithContent = [];
      
      for (const doc of documents) {
        try {
          const content = await this.getDocumentContent(doc.id, doc.mimeType);
          if (content && content.length > 50) { // Only index substantial content
            documentsWithContent.push({
              id: doc.id,
              name: doc.name,
              content,
              parentFolder: doc.parentFolder,
            });
          }
        } catch (error) {
          console.warn(`Failed to get content for ${doc.name}:`, error);
        }
      }
      
      await aiSDKVectorSearchService.indexDocuments(documentsWithContent);
      console.log(`✅ Indexed ${documentsWithContent.length} documents for vector search`);
      
      return documentsWithContent.length;
    } catch (error) {
      console.error('❌ Failed to index documents for vector search:', error);
      throw error;
    }
  }

  /**
   * Enhanced search that combines keyword and vector search
   */
  async enhancedSearchDocuments(query: string, topK: number = 5) {
    try {
      // Try vector search first (if available)
      const vectorResults = await aiSDKVectorSearchService.searchDocuments(query, topK);
      
      if (vectorResults.length > 0) {
        console.log('🔍 Using vector search results');
        return vectorResults.map(result => ({
          id: result.documentId,
          name: result.documentName,
          parentFolder: result.parentFolder,
          content: result.content,
          relevanceScore: result.similarity,
          searchMethod: 'vector',
          webViewLink: `https://drive.google.com/file/d/${result.documentId}/view`, // Add webViewLink for chat API
        }));
      }
    } catch (error) {
      console.warn('⚠️ Vector search failed, falling back to keyword search:', error);
    }
    
    // Fallback to keyword search
    console.log('🔍 Using keyword search results');
    return this.searchDocuments(query);
  }

  /**
   * Get relevant documents with enhanced search capabilities
   */
  async getRelevantDocuments(query: string, topK: number = 5) {
    // Use enhanced search if vector search is available
    try {
      const status = aiSDKVectorSearchService.getIndexingStatus();
      if (status.isIndexed && status.totalChunks > 0) {
        return this.enhancedSearchDocuments(query, topK);
      }
    } catch (error) {
      console.warn('Vector search not available, using keyword search');
    }
    
    // Fallback to original keyword search
    return this.searchDocuments(query);
  }

  private extractKeyTerms(query: string): string[] {
    // Simple keyword extraction - in production, you might want more sophisticated NLP
    const kolibriTerms = [
      'kolibri', 'installation', 'setup', 'hardware', 'provisioning',
      'learner', 'data', 'syncing', 'blended', 'learning', 'implementation',
      'emergencies', 'case study', 'project based', 'wildlife', 'conservancy',
      'v0.15', 'v0.16', 'guide', 'resources', 'documentation', 'lewa'
    ];

    const queryLower = query.toLowerCase();
    return kolibriTerms.filter(term => queryLower.includes(term));
  }

  // Method to clear cache (useful for testing)
  clearCache(): void {
    this.documentCache.clear();
  }
}

export const googleDriveService = new GoogleDriveService();
