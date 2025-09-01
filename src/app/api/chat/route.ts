import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';

// Helper function to detect training-related queries
function isTrainingQuestion(content: string): boolean {
  const trainingKeywords = [
    'train', 'training', 'teach', 'teaching', 'instruct', 'instruction',
    'facilitate', 'facilitation', 'workshop', 'session', 'course',
    'educate', 'education', 'mentor', 'mentoring', 'coach', 'coaching',
    'how to train', 'how to teach', 'how to instruct', 'training others',
    'training materials', 'training resources', 'training guide'
  ];
  
  const lowerContent = content.toLowerCase();
  return trainingKeywords.some(keyword => lowerContent.includes(keyword));
}

// Helper function to detect language-related queries
function isLanguageQuestion(content: string): boolean {
  const languageKeywords = [
    'language', 'languages', 'arabic', 'french', 'hindi', 'marathi', 
    'portuguese', 'spanish', 'swahili', 'multilingual', 'translation',
    'other languages', 'available languages', 'language support',
    'toolkit languages', 'edtech toolkit languages'
  ];
  
  const lowerContent = content.toLowerCase();
  return languageKeywords.some(keyword => lowerContent.includes(keyword));
}

// Helper function to detect general toolkit questions
function isToolkitQuestion(content: string): boolean {
  const toolkitKeywords = [
    'toolkit', 'edtech toolkit', 'what is in the toolkit', 'what does the toolkit contain',
    'what is available in the toolkit', 'what is the toolkit', 'toolkit contents',
    'toolkit materials', 'toolkit resources', 'what is kolibri toolkit'
  ];
  
  const lowerContent = content.toLowerCase();
  return toolkitKeywords.some(keyword => lowerContent.includes(keyword));
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1];

    // Get relevant documents from Google Drive
    let contextDocuments = '';
    let documentEvidence = '';
    let documentsUsed: any[] = [];
    
    try {
      // Check if this is a training-related, language-related, or toolkit-related query
      const isTrainingQuery = isTrainingQuestion(userMessage.content);
      const isLanguageQuery = isLanguageQuestion(userMessage.content);
      const isToolkitQuery = isToolkitQuestion(userMessage.content);
      
      const relevantDocs = await googleDriveService.getRelevantDocuments(userMessage.content);
      documentsUsed = relevantDocs;
      
      console.log(`🔍 Found ${relevantDocs.length} relevant documents for query: "${userMessage.content}"`);
      relevantDocs.forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.name} (${doc.content?.length || 0} chars)`);
      });
      
      if (relevantDocs.length > 0) {
        contextDocuments = '\n\nRelevant documents from Kolibri documentation:\n';
        
        // Special handling for training queries
        if (isTrainingQuery) {
          documentEvidence = '\n\n🎯 **Training Resources Available:**\n\n';
          documentEvidence += `**📁 Kolibri Training Pack** - [Open Training Folder](https://drive.google.com/drive/folders/18-_tUxH3rPFxe7HTDCJ8DENq_Kq3eAOL?usp=drive_link)\n\n`;
          documentEvidence += `This comprehensive training resource contains:\n`;
          documentEvidence += `• **Training Manual** - Complete guide for conducting Kolibri training sessions\n`;
          documentEvidence += `• **Training Presentations** - Ready-to-use slide decks for different training contexts\n`;
          documentEvidence += `• **Training Workbook and Handouts** - Materials for participants and facilitators\n`;
          documentEvidence += `• **Program Support** - Additional resources for peer mentoring and coaching\n\n`;
          documentEvidence += `*All materials can be adapted for different training contexts and audiences.*\n\n---\n\n`;
        } else if (isLanguageQuery) {
          // Special handling for language queries
          documentEvidence = '\n\n🌍 **Multilingual Toolkit Available:**\n\n';
          documentEvidence += `**📁 Kolibri Edtech Toolkit v4** - [Open Multilingual Folder](https://drive.google.com/drive/folders/1s4Dp4SLz0FXcfs5F5yMCkVCD5DKRGayl?usp=drive_link)\n\n`;
          documentEvidence += `Our comprehensive toolkit is available in multiple languages:\n`;
          documentEvidence += `• **Arabic** - Arabic language materials and resources\n`;
          documentEvidence += `• **French** - French language materials and resources\n`;
          documentEvidence += `• **Hindi** - Hindi language materials and resources\n`;
          documentEvidence += `• **Marathi** - Marathi language materials and resources\n`;
          documentEvidence += `• **Portuguese** - Portuguese language materials and resources\n`;
          documentEvidence += `• **Spanish** - Spanish language materials and resources\n`;
          documentEvidence += `• **Swahili** - Swahili language materials and resources\n\n`;
          documentEvidence += `---\n\n`;
        } else if (isToolkitQuery) {
          // Special handling for toolkit questions
          documentEvidence = '\n\n📚 **Kolibri Edtech Toolkit v4:**\n\n';
          documentEvidence += `**📁 Main Toolkit Folder** - [Open Toolkit](https://drive.google.com/drive/folders/1s4Dp4SLz0FXcfs5F5yMCkVCD5DKRGayl?usp=drive_link)\n\n`;
          documentEvidence += `**📖 Detailed Information:** [Kolibri Edtech Toolkit v4 README](https://docs.google.com/document/d/1cg5ZnmCs66tGLfNNXWBQLOzmp8VJagjfwKai9fSe3J8/edit?tab=t.0) - Complete overview of toolkit contents, structure, and how to use it\n\n`;
          documentEvidence += `---\n\n`;
        } else {
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
            documentEvidence += ` - [View Document](${doc.webViewLink})\n\n`;
          });
          
          documentEvidence += `\n*I found ${relevantDocs.length} relevant document(s) from your Kolibri documentation folder.*\n\n---\n\n`;
        }
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
5. YOUR RESPONSE MUST START WITH THIS EXACT TEXT: ${documentEvidence}
6. After the document evidence, provide your answer based on the documents with proper paragraph spacing
7. Format your response with clear separation between the document references and your answer
8. For training-related queries, emphasize the comprehensive nature of the Training Pack and its adaptability

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
