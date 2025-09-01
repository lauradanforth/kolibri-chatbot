import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

import { aiSDKVectorSearchService } from './ai-sdk-vector-search';

// Google Drive API configuration
const FOLDER_IDS = [
  '11OBGEVcpY_e3wkWIbYf51yZiAz_-JIsV', // Current folder
  '183II-4V8K4s7IR2-5NW1P3EiuQAODZl6', // English Training Packs folder
];

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
    // Prefer explicit service-account env vars when available (safer for serverless)
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const serviceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    // Fallback to key file (works locally); relative to project root
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || './learninge-291168aade81.json';

    const commonScopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/documents.readonly',
    ];

    const auth = serviceAccountEmail && serviceAccountPrivateKey
      ? new GoogleAuth({
          credentials: {
            client_email: serviceAccountEmail,
            // Support escaped newlines when set via env
            private_key: serviceAccountPrivateKey.replace(/\\n/g, '\n'),
          },
          scopes: commonScopes,
        })
      : new GoogleAuth({
          keyFile,
          scopes: commonScopes,
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
      const allDocuments: DriveDocument[] = [];
      
      for (const folderId of FOLDER_IDS) {
        const folderDocs = await this.listDocumentsRecursive(folderId, '');
        allDocuments.push(...folderDocs);
      }
      
      return allDocuments;
    } catch (error: any) {
      console.error('Error listing documents:', error.message);
      throw new Error(`Failed to list documents from Google Drive: ${error.message}`);
    }
  }

  private async listDocumentsRecursive(folderId: string, parentPath: string, depth: number = 0): Promise<DriveDocument[]> {
    // Prevent infinite recursion by limiting depth
    if (depth > 10) {
      console.warn(`⚠️ Maximum folder depth (10) reached for ${parentPath}, stopping recursion`);
      return [];
    }
    
    const allDocuments: DriveDocument[] = [];
    
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType,webViewLink)',
        orderBy: 'name',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives', // This enables access to shared drives
      });

      const files = response.data.files || [];
      
      for (const file of files) {
        const currentPath = parentPath ? `${parentPath}/${file.name}` : file.name;
        
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          // Recursively search subfolders with depth tracking
          const subfolderDocs = await this.listDocumentsRecursive(file.id, currentPath, depth + 1);
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
      console.log(`📁 Found ${documents.length} total documents to process`);
      
      // Limit the number of documents to prevent overwhelming the system
      const maxDocuments = 100; // Process max 100 documents at once
      const documentsToProcess = documents.slice(0, maxDocuments);
      
      if (documents.length > maxDocuments) {
        console.log(`⚠️ Limiting processing to first ${maxDocuments} documents out of ${documents.length} total`);
      }
      
      const documentsWithContent = [];
      
      for (const [index, doc] of documentsToProcess.entries()) {
        try {
          console.log(`📄 Processing document ${index + 1}/${documentsToProcess.length}: ${doc.name}`);
          const content = await this.getDocumentContent(doc.id, doc.mimeType);
          
          // Filter content: must be substantial but not too long
          if (content && content.length > 50 && content.length < 10000) {
            // Truncate very long content to prevent token issues
            const truncatedContent = content.length > 5000 ? content.substring(0, 5000) + '...' : content;
            
            documentsWithContent.push({
              id: doc.id,
              name: doc.name,
              content: truncatedContent,
              parentFolder: doc.parentFolder,
            });
          } else if (content && content.length >= 10000) {
            console.log(`⚠️ Skipping ${doc.name} - content too long (${content.length} chars)`);
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
        const enhancedResults = [];
        
        for (const result of vectorResults) {
          // Handle User Guide results differently from Google Drive results
          if (result.source === 'kolibri-user-guide') {
            // User Guide chunks already have content, no need to fetch from Google Drive
            enhancedResults.push({
              id: result.documentId,
              name: result.documentName,
              parentFolder: result.parentFolder,
              content: result.content,
              relevanceScore: result.similarity,
              searchMethod: 'vector',
              webViewLink: result.url || '#', // Use the User Guide URL if available
            });
          } else {
            // Google Drive results need full content retrieval
            try {
              const fullContent = await this.getDocumentContent(result.documentId, 'application/vnd.google-apps.document');
              
              enhancedResults.push({
                id: result.documentId,
                name: result.documentName,
                parentFolder: result.parentFolder,
                content: fullContent, // Use full content instead of chunked content
                relevanceScore: result.similarity,
                searchMethod: 'vector',
                webViewLink: `https://drive.google.com/file/d/${result.documentId}/view`,
              });
            } catch (error) {
              console.warn(`Failed to get full content for ${result.documentName}:`, error);
              // Fall back to the chunked content if full content retrieval fails
              enhancedResults.push({
                id: result.documentId,
                name: result.documentName,
                parentFolder: result.parentFolder,
                content: result.content,
                relevanceScore: result.similarity,
                searchMethod: 'vector',
                webViewLink: `https://drive.google.com/file/d/${result.documentId}/view`,
              });
            }
          }
        }
        
        return enhancedResults;
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

  /**
   * Test access to a specific folder and return detailed information
   */
  async testFolderAccess(folderId: string) {
    try {
      console.log(`🔍 Testing access to folder: ${folderId}`);
      
      // First, try to get basic folder info
      const folderResponse = await this.drive.files.get({
        fileId: folderId,
        fields: 'id,name,mimeType,webViewLink,parents',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      
      const folderName = folderResponse.data.name || 'Unknown Folder';
      console.log(`✅ Folder accessible: ${folderName}`);
      
      // Now list all contents
      const contentsResponse = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType,webViewLink)',
        orderBy: 'name',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives',
      });
      
      const files = contentsResponse.data.files || [];
      const documents = [];
      const subfolders = [];
      
      for (const file of files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          subfolders.push({
            id: file.id,
            name: file.name,
            webViewLink: file.webViewLink
          });
        } else {
          documents.push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            webViewLink: file.webViewLink
          });
        }
      }
      
      return {
        accessible: true,
        folderName,
        documentCount: documents.length,
        subfolderCount: subfolders.length,
        documents,
        subfolders,
        webViewLink: folderResponse.data.webViewLink
      };
      
    } catch (error: any) {
      console.error(`❌ Error accessing folder ${folderId}:`, error.message);
      return {
        accessible: false,
        error: error.message,
        folderName: 'Unknown',
        documentCount: 0,
        subfolderCount: 0,
        documents: [],
        subfolders: []
      };
    }
  }

  /**
   * Test access to all configured folders
   */
  async testAllFolderAccess() {
    const results = [];
    
    for (const folderId of FOLDER_IDS) {
      const result = await this.testFolderAccess(folderId);
      results.push({
        folderId,
        ...result
      });
    }
    
    return results;
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
