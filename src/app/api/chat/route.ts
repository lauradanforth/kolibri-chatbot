import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1];

    // Get relevant documents from Google Drive
    let contextDocuments = '';
    let documentEvidence = '';
    let documentsUsed: any[] = [];
    
    try {
      const relevantDocs = await googleDriveService.getRelevantDocuments(userMessage.content);
      documentsUsed = relevantDocs;
      
      if (relevantDocs.length > 0) {
        contextDocuments = '\n\nRelevant documents from Kolibri documentation:\n';
        documentEvidence = '\n\n📚 **Documents Referenced:**\n';
        
        relevantDocs.forEach((doc, index) => {
          contextDocuments += `\n${index + 1}. ${doc.name}`;
          if (doc.parentFolder && doc.parentFolder !== 'Root Folder') {
            contextDocuments += ` (in ${doc.parentFolder})`;
          }
          contextDocuments += `:\n`;
          contextDocuments += `${doc.content}\n`;
          contextDocuments += `Source: ${doc.webViewLink}\n`;
          
          documentEvidence += `• **${doc.name}`;
          if (doc.parentFolder && doc.parentFolder !== 'Root Folder') {
            documentEvidence += `** (in ${doc.parentFolder})`;
          } else {
            documentEvidence += `**`;
          }
          documentEvidence += ` - [View Document](${doc.webViewLink})\n`;
        });
        
        documentEvidence += `\n*I found ${relevantDocs.length} relevant document(s) from your Kolibri documentation folder.*\n\n`;
      } else {
        // No documents found - tell the user
        return new Response(JSON.stringify({
          error: 'No relevant documents found',
          message: 'I couldn\'t find any relevant documents in the Kolibri documentation folder for your query. Please try asking about specific topics like: Kolibri installation, hardware setup, blended learning, case studies, or implementation guides.',
          availableTopics: [
            'Kolibri v0.15 and v0.16 features',
            'Hardware setup and provisioning',
            'Blended learning implementation',
            'Case studies (Lewa Wildlife Conservancy)',
            'Education in emergencies',
            'Implementation guides and resources'
          ]
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('Error fetching Google Drive documents:', error);
      return new Response(JSON.stringify({
        error: 'Document access failed',
        message: 'I\'m unable to access the Kolibri documentation at the moment. Please check that the Google Drive folder is accessible and try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const systemPrompt = `You are a helpful assistant that helps users understand Kolibri, an offline-first learning platform. 

You can ONLY respond with information found in the provided documents. If the information is not in the documents, you must say so.

${contextDocuments}

IMPORTANT RULES:
1. ONLY use information from the documents provided above
2. If asked about something not covered in the documents, say "I don't have information about that in the available documents"
3. Always cite the specific document name when providing information
4. Provide the source link when referencing documents
5. Start your response with the document evidence provided

Keep responses friendly, informative, and focused on helping users understand and use Kolibri effectively based on the official documentation.`;

    const result = await streamText({
      model: openai('gpt-3.5-turbo'),
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      maxTokens: 1000,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({
      error: 'Chat processing failed',
      message: 'An error occurred while processing your request. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
