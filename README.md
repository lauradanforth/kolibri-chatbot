# Getting Started with Kolibri Chatbot (Simplified)

A simple, local-first chatbot that helps users understand Kolibri. This version is designed to work locally without complex external dependencies.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Environment Variables
Create a `.env.local` file in the root directory and add your API keys:

```bash
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_APPLICATION_CREDENTIALS=./your-service-account-key.json
```

To get an OpenAI API key:
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Create a new API key
4. Copy it to your `.env.local` file

To set up Google Drive access:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Drive API and Google Docs API
4. Create a service account and download the JSON key
5. Place the JSON file in your project root and update the path in `.env.local`

### 3. Start Development Server
```bash
npm run dev
```

### 4. Open in Browser
Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Features

- **Simple Chat Interface**: Clean, responsive chat UI
- **Google Drive Integration**: Access documents from your Google Drive folder
- **Content-Based Search**: Find relevant information within document content
- **Vector Search**: Semantic search using AI embeddings for better understanding
- **Real-time Responses**: Streaming responses from OpenAI
- **Document Citations**: See which documents were used to generate responses

## 🛠️ Technical Stack

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **AI**: OpenAI GPT-3.5-turbo via AI SDK
- **Vector Search**: OpenAI text-embedding-3-small via AI SDK
- **Google Drive**: Google Drive API and Google Docs API
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React hooks with AI SDK

## 📋 What's Included

- ✅ Chat interface with document-based responses
- ✅ Google Drive integration for document access
- ✅ Content-based search within documents
- ✅ Vector search using AI embeddings
- ✅ Real-time message streaming
- ✅ Document citations and links
- ✅ Responsive design
- ✅ TypeScript support

## 🔍 Vector Search Features

The chatbot now includes advanced vector search capabilities:

### How it works:
1. **Document Indexing**: Documents are split into chunks and converted to embeddings
2. **Semantic Search**: User queries are converted to embeddings and matched semantically
3. **Hybrid Approach**: Combines vector search with keyword search for best results

### Benefits:
- **Better Understanding**: Finds conceptually related content, not just exact matches
- **Improved Accuracy**: More relevant responses even with different word choices
- **Context Awareness**: Understands user intent and context

### Usage:
1. **Index Documents**: `POST /api/index-documents` (one-time setup)
2. **Test Search**: `POST /api/test-vector-search` with `{"query": "your question"}`
3. **Automatic**: The chatbot automatically uses vector search when available

## 🔄 Next Steps (Future Enhancements)

- [ ] Google Drive integration for document access
- [ ] Document search and retrieval
- [ ] Source citation with document links
- [ ] Conversation history persistence
- [ ] Advanced UI features

## 🐛 Troubleshooting

### "Error processing chat request"
- Make sure you have a valid OpenAI API key in `.env.local`
- Check that the API key has sufficient credits

### "Module not found" errors
- Run `npm install` to ensure all dependencies are installed

### Port already in use
- The app runs on port 3000 by default
- If busy, Next.js will automatically try the next available port

## 📝 Development Notes

This is a simplified version designed for local development. It uses:
- Basic system prompt instead of document retrieval
- No authentication (simple guest access)
- No database (conversations not persisted)
- No external services beyond OpenAI API

Perfect for testing and development before adding more complex features!
