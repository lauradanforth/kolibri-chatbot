import { NextRequest } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Testing access to all configured folders...');
    
    const results = await googleDriveService.testAllFolderAccess();
    
    return new Response(JSON.stringify({
      success: true,
      results,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Folder access test failed:', error);
    return new Response(JSON.stringify({
      error: 'Folder access test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
