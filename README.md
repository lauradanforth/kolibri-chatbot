# Getting Started with Kolibri Chatbot (Simplified)

A simple, local-first chatbot that helps users understand Kolibri. This version is designed to work locally without complex external dependencies.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Environment Variables
Create a `.env.local` file in the root directory and add your OpenAI API key:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

To get an OpenAI API key:
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Create a new API key
4. Copy it to your `.env.local` file

### 3. Start Development Server
```bash
npm run dev
```

### 4. Open in Browser
Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Features

- **Simple Chat Interface**: Clean, responsive chat UI
- **Kolibri Knowledge**: Pre-configured with Kolibri information
- **Real-time Responses**: Streaming responses from OpenAI
- **Local Development**: No external databases or services required

## 🛠️ Technical Stack

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **AI**: OpenAI GPT-3.5-turbo via AI SDK
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React hooks with AI SDK

## 📋 What's Included

- ✅ Basic chat interface
- ✅ Kolibri-focused system prompt
- ✅ Real-time message streaming
- ✅ Responsive design
- ✅ TypeScript support

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
