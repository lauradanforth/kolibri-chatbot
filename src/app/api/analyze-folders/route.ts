import { NextRequest } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Starting detailed folder analysis...');
    
    // Get the folder IDs from the service
    const folderIds = [
      '11OBGEVcpY_e3wkWIbYf51yZiAz_-JIsV', // Current folder
      '1s4Dp4SLz0FXcfs5F5yMCkVCD5DKRGayl', // Kolibri Edtech Toolkit v4 folder
    ];
    
    const analysis = {
      totalFolders: folderIds.length,
      folders: [],
      summary: {
        totalDocuments: 0,
        totalSubfolders: 0,
        accessibleFolders: 0,
        inaccessibleFolders: 0,
      }
    };
    
    for (const folderId of folderIds) {
      try {
        console.log(`📁 Analyzing folder: ${folderId}`);
        
        const folderInfo = await analyzeFolder(folderId);
        analysis.folders.push(folderInfo);
        
        if (folderInfo.accessible) {
          analysis.summary.accessibleFolders++;
          analysis.summary.totalDocuments += folderInfo.documentCount;
          analysis.summary.totalSubfolders += folderInfo.subfolderCount;
        } else {
          analysis.summary.inaccessibleFolders++;
        }
        
      } catch (error) {
        console.error(`❌ Error analyzing folder ${folderId}:`, error);
        analysis.folders.push({
          id: folderId,
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          documentCount: 0,
          subfolderCount: 0,
          documents: [],
          subfolders: []
        });
        analysis.summary.inaccessibleFolders++;
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Folder analysis failed:', error);
    return new Response(JSON.stringify({
      error: 'Folder analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function analyzeFolder(folderId: string) {
  const { drive } = await import('googleapis');
  const { GoogleAuth } = await import('google-auth-library');
  
  // Create a new auth instance for this analysis
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || './learninge-291168aade81.json';
  const auth = new GoogleAuth({
    keyFile,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/documents.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly'
    ],
  });
  
  const driveService = drive({
    version: 'v3',
    auth,
  });
  
  try {
    // First, try to get basic folder info
    const folderResponse = await driveService.files.get({
      fileId: folderId,
      fields: 'id,name,mimeType,webViewLink,parents',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    const folderName = folderResponse.data.name || 'Unknown Folder';
    console.log(`📁 Folder name: ${folderName}`);
    
    // Now list all contents
    const contentsResponse = await driveService.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,webViewLink,parents)',
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
    
    // Recursively analyze subfolders
    const subfolderDetails = [];
    for (const subfolder of subfolders) {
      try {
        const subAnalysis = await analyzeSubfolderRecursively(subfolder.id, driveService);
        subfolderDetails.push({
          ...subfolder,
          documentCount: subAnalysis.documentCount,
          subfolderCount: subAnalysis.subfolderCount,
          totalDocuments: subAnalysis.totalDocuments
        });
      } catch (error) {
        console.warn(`⚠️ Could not analyze subfolder ${subfolder.name}:`, error);
        subfolderDetails.push({
          ...subfolder,
          documentCount: 0,
          subfolderCount: 0,
          totalDocuments: 0,
          error: 'Could not analyze subfolder'
        });
      }
    }
    
    return {
      id: folderId,
      name: folderName,
      accessible: true,
      documentCount: documents.length,
      subfolderCount: subfolders.length,
      totalDocuments: documents.length + subfolderDetails.reduce((sum, sf) => sum + sf.totalDocuments, 0),
      documents,
      subfolders: subfolderDetails,
      webViewLink: folderResponse.data.webViewLink
    };
    
  } catch (error) {
    console.error(`❌ Error accessing folder ${folderId}:`, error);
    return {
      id: folderId,
      accessible: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      documentCount: 0,
      subfolderCount: 0,
      totalDocuments: 0,
      documents: [],
      subfolders: []
    };
  }
}

async function analyzeSubfolderRecursively(folderId: string, driveService: any, depth: number = 0): Promise<{
  documentCount: number;
  subfolderCount: number;
  totalDocuments: number;
}> {
  if (depth > 5) { // Prevent infinite recursion
    return { documentCount: 0, subfolderCount: 0, totalDocuments: 0 };
  }
  
  try {
    const response = await driveService.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    });
    
    const files = response.data.files || [];
    let documentCount = 0;
    let subfolderCount = 0;
    let totalDocuments = 0;
    
    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        subfolderCount++;
        const subAnalysis = await analyzeSubfolderRecursively(file.id, driveService, depth + 1);
        totalDocuments += subAnalysis.totalDocuments;
      } else {
        documentCount++;
        totalDocuments++;
      }
    }
    
    return { documentCount, subfolderCount, totalDocuments };
    
  } catch (error) {
    console.warn(`⚠️ Error analyzing subfolder at depth ${depth}:`, error);
    return { documentCount: 0, subfolderCount: 0, totalDocuments: 0 };
  }
}
