import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { googleDriveService } from '@/lib/google-drive';
import { aiSDKVectorSearchService } from '@/lib/ai-sdk-vector-search';
import { ChatLogger } from '@/lib/chat-logger';

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

// Helper function to detect download-related queries
function isDownloadQuestion(content: string): boolean {
  const downloadKeywords = [
    'download', 'download kolibri', 'get kolibri', 'install kolibri', 'how to download',
    'where to download', 'download link', 'download page', 'kolibri download',
    'i would like to download', 'want to download', 'need to download'
  ];
  
  const lowerContent = content.toLowerCase();
  return downloadKeywords.some(keyword => lowerContent.includes(keyword));
}

// Helper function to detect resource/library-related queries
function isResourceQuestion(content: string): boolean {
  const resourceKeywords = [
    'resources', 'library', 'content', 'materials', 'educational resources',
    'open educational resources', 'oer', 'what resources', 'available resources',
    'know more about resources', 'browse resources', 'catalog', 'kolibri library',
    'learning materials', 'educational content', 'what content is available'
  ];
  
  const lowerContent = content.toLowerCase();
  return resourceKeywords.some(keyword => lowerContent.includes(keyword));
}

// Helper function to detect Studio/curation-related queries
function isStudioQuestion(content: string): boolean {
  const studioKeywords = [
    'studio', 'kolibri studio', 'add resources', 'my own resources', 'curate',
    'curation', 'create content', 'upload resources', 'build channels',
    'organize resources', 'curriculum tool', 'offline use', 'create account',
    'studio account', 'add my own', 'curate with existing'
  ];
  
  const lowerContent = content.toLowerCase();
  return studioKeywords.some(keyword => lowerContent.includes(keyword));
}

// Helper function to detect feedback/suggestion-related queries
function isFeedbackQuestion(content: string): boolean {
  const feedbackKeywords = [
    'feedback', 'suggestions', 'propose', 'new features', 'feature request',
    'improve', 'enhancement', 'make suggestions', 'give feedback',
    'propose features', 'content feedback', 'suggest improvements',
    'request feature', 'community forum'
  ];
  
  const lowerContent = content.toLowerCase();
  return feedbackKeywords.some(keyword => lowerContent.includes(keyword));
}

// Helper function to detect bug/issue-related queries
function isBugQuestion(content: string): boolean {
  const bugKeywords = [
    'bug', 'found a bug', 'bug report', 'report issue', 'technical issue',
    'problem', 'error', 'broken', 'not working', 'issue with', 'defect',
    'glitch', 'crash', 'freeze', 'malfunction', 'technical problem'
  ];
  
  const lowerContent = content.toLowerCase();
  return bugKeywords.some(keyword => lowerContent.includes(keyword));
}

// Helper function to detect technical support-related queries
function isTechnicalSupportQuestion(content: string): boolean {
  const supportKeywords = [
    'technical support', 'help with', 'need help', 'technical challenge',
    'technical problem', 'support', 'assistance', 'troubleshoot',
    'troubleshooting', 'technical assistance', 'help me', 'how to fix',
    'technical issue', 'problem with', 'not working', 'error',
    'broken', 'crash', 'freeze', 'malfunction', 'technical help'
  ];
  
  const lowerContent = content.toLowerCase();
  return supportKeywords.some(keyword => lowerContent.includes(keyword));
}

// Helper function to detect demo/exploration-related queries
function isDemoQuestion(content: string): boolean {
  const demoKeywords = [
    'demo', 'demonstration', 'explore', 'try out', 'test drive',
    'sample', 'preview', 'see how it works', 'experience',
    'online version', 'demo site', 'demo version', 'play with',
    'hands on', 'interactive demo', 'live demo'
  ];
  
  const lowerContent = content.toLowerCase();
  return demoKeywords.some(keyword => lowerContent.includes(keyword));
}

// Helper function to detect user guide/manual-related queries
function isUserGuideQuestion(content: string): boolean {
  const guideKeywords = [
    'manual', 'user guide', 'documentation', 'read the manual',
    'setup guide', 'installation guide', 'how to use', 'tutorial',
    'learn how to', 'understand features', 'get started',
    'beginner guide', 'reference manual', 'help documentation',
    'user manual', 'setup instructions', 'usage guide'
  ];
  
  const lowerContent = content.toLowerCase();
  return guideKeywords.some(keyword => lowerContent.includes(keyword));
}

export async function POST(req: NextRequest) {
  try {
    const { messages, sessionId } = await req.json();
    const userMessage = messages[messages.length - 1];
    
    // Generate session ID if not provided
    const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract user agent from request headers
    const userAgent = req.headers.get('user-agent');

    // Get relevant documents from Google Drive
    let contextDocuments = '';
    let documentEvidence = '';
    let documentsUsed: any[] = [];
    
    try {
      // Check if this is a training-related, language-related, toolkit-related, download-related, resource-related, studio-related, feedback-related, bug-related, technical support-related, demo-related, or user guide-related query
      const isTrainingQuery = isTrainingQuestion(userMessage.content);
      const isLanguageQuery = isLanguageQuestion(userMessage.content);
      const isToolkitQuery = isToolkitQuestion(userMessage.content);
      const isDownloadQuery = isDownloadQuestion(userMessage.content);
      console.log(`🔍 Download query detection: "${userMessage.content}" -> ${isDownloadQuery}`);
      const isResourceQuery = isResourceQuestion(userMessage.content);
      const isStudioQuery = isStudioQuestion(userMessage.content);
      const isFeedbackQuery = isFeedbackQuestion(userMessage.content);
      const isBugQuery = isBugQuestion(userMessage.content);
      const isTechnicalSupportQuery = isTechnicalSupportQuestion(userMessage.content);
      const isDemoQuery = isDemoQuestion(userMessage.content);
      const isUserGuideQuery = isUserGuideQuestion(userMessage.content);
      
      const relevantDocs = await googleDriveService.getRelevantDocuments(userMessage.content);
      
      // Find relevant documents using enhanced vector search (Google Drive + User Guide)
      let relevantUserGuideDocs: any[] = [];
      try {
        const vectorSearchResults = await aiSDKVectorSearchService.searchDocuments(userMessage.content, 10);
        relevantUserGuideDocs = vectorSearchResults
          .filter(result => result.source === 'kolibri-user-guide')
          .map(result => ({
            id: result.documentId,
            name: result.documentName,
            content: result.content,
            webViewLink: result.url || '#',
            parentFolder: result.parentSection || 'Kolibri User Guide',
            relevanceScore: result.similarity,
            searchMethod: 'vector-search'
          }));
      } catch (error) {
        console.warn('⚠️ Vector search failed, falling back to Google Drive only:', error);
      }
      
      console.log(`🔍 Vector search results for: "${userMessage.content}"`);
      console.log(`🔍 Found ${relevantUserGuideDocs.length} relevant User Guide documents:`);
      relevantUserGuideDocs.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.name} - ${doc.parentFolder}`);
      });
      
      // Combine both sources of information
      const allRelevantDocs = [...relevantDocs];
      
      // Add relevant User Guide documents
      relevantUserGuideDocs.forEach((doc) => {
        allRelevantDocs.push(doc);
      });
      
      documentsUsed = allRelevantDocs;
      
      console.log(`🔍 Found ${allRelevantDocs.length} total relevant sources (${relevantDocs.length} Google Drive + ${relevantUserGuideDocs.length} User Guide)`);
      allRelevantDocs.forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.name} (${doc.content?.length || 0} chars) - ${doc.parentFolder}`);
      });
      
      if (allRelevantDocs.length > 0) {
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
        } else if (isDownloadQuery) {
          // Special handling for download queries
          documentEvidence = '\n\n💾 **Download Kolibri:**\n\n';
          documentEvidence += `**🔗 Official Download Page:** [Download Kolibri](https://learningequality.org/download/) - Get the latest version for your platform\n\n`;
          documentEvidence += `**📱 Available Platforms:**\n`;
          documentEvidence += `• **Windows** - .exe installer with launcher and tray icon\n`;
          documentEvidence += `• **Ubuntu/Debian** - .deb package with automatic updates\n`;
          documentEvidence += `• **Raspberry Pi** - Configure as server and hotspot\n`;
          documentEvidence += `• **MacOS** - Stand-alone app (not for server use)\n`;
          documentEvidence += `• **Python** - Portable executable for Python 3.6+\n\n`;
          documentEvidence += `**🌍 Language Support:** Available in 30+ languages including English, Arabic, French, Hindi, Spanish, Swahili, and more\n\n`;
          documentEvidence += `---\n\n`;
        } else if (isResourceQuery) {
          // Special handling for resource/library queries
          documentEvidence = '\n\n📚 **Kolibri Library & Resources:**\n\n';
          documentEvidence += `**🔗 Public Resource Catalog:** [Browse Kolibri Library](https://catalog.learningequality.org/#/public) - Explore open educational resources available for use in Kolibri\n\n`;
          documentEvidence += `**📖 What You'll Find:**\n`;
          documentEvidence += `• **Open Educational Resources (OER)** - Freely available learning materials\n`;
          documentEvidence += `• **Subject Coverage** - Math, Science, Language Arts, Social Studies, and more\n`;
          documentEvidence += `• **Content Types** - Videos, interactive exercises, documents, and assessments\n`;
          documentEvidence += `• **Grade Levels** - Materials for K-12 and adult learners\n`;
          documentEvidence += `• **Multilingual Content** - Resources in various languages\n\n`;
          documentEvidence += `**💡 Tip:** Use the catalog to discover content you can import into your Kolibri installation\n\n`;
          documentEvidence += `---\n\n`;
        } else if (isStudioQuery) {
          // Special handling for Studio/curation queries
          documentEvidence = '\n\n🎨 **Kolibri Studio - Content Creation & Curation:**\n\n';
          documentEvidence += `**🔗 Create Studio Account:** [Kolibri Studio](https://studio.learningequality.org/en/accounts/#/) - Online curriculum tool for organizing and curating learning resources\n\n`;
          documentEvidence += `**📖 User Guide:** [Kolibri Studio User Guide](https://kolibri-studio.readthedocs.io/en/latest/) - Comprehensive documentation on how to use Studio effectively\n\n`;
          documentEvidence += `**🚀 What You Can Do:**\n`;
          documentEvidence += `• **Add Your Own Resources** - Upload and organize your learning materials\n`;
          documentEvidence += `• **Curate Existing Content** - Select and organize resources from the public library\n`;
          documentEvidence += `• **Build Custom Channels** - Create personalized learning pathways\n`;
          documentEvidence += `• **Organize Curriculum** - Structure content for specific learning objectives\n`;
          documentEvidence += `• **Prepare for Offline Use** - Build channels that work in Kolibri installations\n\n`;
          documentEvidence += `**💡 Perfect For:** Educators, content creators, curriculum developers, and organizations wanting to customize their Kolibri experience\n\n`;
          documentEvidence += `**📚 Learn More:** The user guide covers channel management, resource selection, best practices, and community standards for creating inclusive learning content\n\n`;
          documentEvidence += `---\n\n`;
        } else if (isFeedbackQuery) {
          // Special handling for feedback/suggestion queries
          documentEvidence = '\n\n💬 **Community Engagement & Feedback:**\n\n';
          documentEvidence += `**🔗 Community Forum:** [Learning Equality Community](https://community.learningequality.org/) - Join our community to share feedback, suggestions, and connect with other users\n\n`;
          documentEvidence += `**💡 How You Can Contribute:**\n`;
          documentEvidence += `• **Make Suggestions** - Propose new features and improvements\n`;
          documentEvidence += `• **Provide Feedback** - Share your experience with existing features and content\n`;
          documentEvidence += `• **Report Issues** - Help identify bugs and technical challenges\n`;
          documentEvidence += `• **Share Stories** - Connect with other implementers and share success stories\n`;
          documentEvidence += `• **Plan Together** - Collaborate on implementation strategies and best practices\n\n`;
          documentEvidence += `**🌍 Community Categories:** Support, Content & Materials, Implementation Planning, Success Stories, and more\n\n`;
          documentEvidence += `---\n\n`;
        } else if (isBugQuery) {
          // Special handling for bug/issue queries
          documentEvidence = '\n\n🐛 **Bug Report & Issue Tracking:**\n\n';
          documentEvidence += `**🔗 GitHub Issues:** [Kolibri GitHub Issues](https://github.com/learningequality/kolibri/issues) - Report bugs and track technical issues\n\n`;
          documentEvidence += `**📋 Before Creating an Issue:**\n`;
          documentEvidence += `• **Search Existing Issues** - Check if your bug has already been reported\n`;
          documentEvidence += `• **Use the Template** - Follow the provided issue template for better tracking\n`;
          documentEvidence += `• **Include Details** - Provide clear steps to reproduce the problem\n`;
          documentEvidence += `• **System Information** - Include your OS, Kolibri version, and error messages\n\n`;
          documentEvidence += `**💡 For Community Support:** If you prefer community help, visit our [Support Forum](https://community.learningequality.org/c/support/11)\n\n`;
          documentEvidence += `---\n\n`;
        } else if (isTechnicalSupportQuery) {
          // Special handling for technical support queries
          documentEvidence = '\n\n🔧 **Technical Support & Assistance:**\n\n';
          documentEvidence += `**🔗 Community Support Forum:** [Learning Equality Community Support](https://community.learningequality.org/c/support/11) - Get help from the team and community\n\n`;
          documentEvidence += `**💬 How to Get Help:**\n`;
          documentEvidence += `• **Search First** - Check if your question has already been answered\n`;
          documentEvidence += `• **Be Specific** - Describe your technical challenge clearly\n`;
          documentEvidence += `• **Include Context** - Mention your setup, version, and what you're trying to do\n`;
          documentEvidence += `• **Community Response** - Get help from experienced users and the Learning Equality team\n\n`;
          documentEvidence += `**📚 Support Categories:** Kolibri, Studio, Hardware, Installation, Content, and more\n\n`;
          documentEvidence += `---\n\n`;
        } else if (isDemoQuery) {
          // Special handling for demo/exploration queries
          documentEvidence = '\n\n🎮 **Kolibri Demo & Exploration:**\n\n';
          documentEvidence += `**🔗 Live Demo Site:** [Kolibri Demo](https://kolibri-demo.learningequality.org/) - Explore Kolibri online before downloading\n\n`;
          documentEvidence += `**✨ What You Can Experience:**\n`;
          documentEvidence += `• **Interactive Learning** - Try out Kolibri's features firsthand\n`;
          documentEvidence += `• **Content Exploration** - Browse sample educational resources\n`;
          documentEvidence += `• **User Interface** - Familiarize yourself with the platform layout\n`;
          documentEvidence += `• **Feature Testing** - Experience how teaching and learning works\n`;
          documentEvidence += `• **No Installation Required** - Access directly from your browser\n\n`;
          documentEvidence += `**📱 Demo Access Options:**\n`;
          documentEvidence += `• **Guest Access** - Explore without creating an account\n`;
          documentEvidence += `• **Learner Account** - Experience the student perspective\n`;
          documentEvidence += `• **Coach Account** - Try out teacher/administrator features\n\n`;
          documentEvidence += `**💡 Perfect For:** Educators, administrators, and anyone wanting to see Kolibri in action before implementation\n\n`;
          documentEvidence += `---\n\n`;
        } else if (isUserGuideQuery) {
          // Special handling for user guide/manual queries
          documentEvidence = '\n\n📖 **Kolibri User Guide & Documentation:**\n\n';
          documentEvidence += `**🔗 Official User Guide:** [Kolibri User Guide](https://kolibri.readthedocs.io/en/latest/) - Comprehensive documentation for setup and usage\n\n`;
          
          if (relevantUserGuideDocs.length > 0) {
            documentEvidence += `**🎯 Most Relevant Sections for Your Query:**\n`;
            relevantUserGuideDocs.forEach(doc => {
              documentEvidence += `• **[${doc.name}](${doc.webViewLink})** - ${doc.content.substring(0, 100)}...\n`;
            });
            documentEvidence += `\n`;
          }
          
          documentEvidence += `**📚 All Available Sections:**\n`;
          documentEvidence += `• **Installation & Setup** - Platform-specific installation instructions\n`;
          documentEvidence += `• **Getting Started** - Initial setup and basic configuration\n`;
          documentEvidence += `• **User Management** - Creating users, classes, and managing permissions\n`;
          documentEvidence += `• **Content Management** - Importing channels and organizing resources\n`;
          documentEvidence += `• **Teaching Tools** - Creating lessons, quizzes, and tracking progress\n`;
          documentEvidence += `• **Device Management** - Device settings and network configuration\n`;
          documentEvidence += `• **Advanced Management** - Command line usage and advanced configuration\n`;
          documentEvidence += `• **Troubleshooting** - Common issues and solutions\n\n`;
          documentEvidence += `**💡 Perfect For:** New users, system administrators, educators setting up Kolibri, and anyone wanting to master the platform\n\n`;
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
    });

    // Log the user message first
    const conversationId = await ChatLogger.logUserMessage(
      req,
      currentSessionId,
      userMessage.content,
      userAgent || undefined
    ).catch(error => {
      console.error('Failed to log user message:', error);
      return null;
    });

    // For now, return the streaming response without logging the assistant response
    // TODO: Implement proper stream capture and logging
    // The current approach only logs user messages due to streaming limitations
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
