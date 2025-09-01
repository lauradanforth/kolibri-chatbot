# Chat Logging System Setup Guide

This guide will help you set up the chat logging system for your Kolibri chatbot.

## 🚀 Quick Start

### 1. Set up Vercel Postgres Database

Since the Vercel CLI database commands aren't available in your current version, you'll need to set up the database manually through the Vercel dashboard:

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Select your project**: `kolibri-chatbot`
3. **Go to Storage tab**
4. **Click "Create Database"**
5. **Choose "Postgres"**
6. **Select "Hobby" plan (Free)**
7. **Choose a region close to your users**
8. **Click "Create"**

### 2. Get Database Connection Details

After creating the database:

1. **Copy the connection string** from the Vercel dashboard
2. **Add it to your environment variables**:
   ```bash
   # Add to your .env.local file
   POSTGRES_URL="your_connection_string_here"
   ```

### 3. Deploy Your App

```bash
vercel --prod
```

## 📊 What Gets Logged

### Conversations Table
- **Session ID**: Unique identifier for each user session
- **User Agent**: Browser/device information
- **IP Address**: User's IP address (anonymized)
- **Timestamps**: When conversations start and update

### Messages Table
- **User Prompts**: What users ask the chatbot
- **Assistant Responses**: Full AI-generated responses
- **Token Usage**: Number of tokens used per message
- **Model Used**: Which AI model generated the response

### Context Usage Table
- **Documents Referenced**: Which Kolibri documents were used
- **Relevance Scores**: How relevant each document was
- **Search Methods**: Whether vector search or Google Drive was used

## 🔧 API Endpoints

### Chat Logging
- **POST** `/api/chat` - Automatically logs all chat interactions

### Logs Management
- **GET** `/api/logs?action=stats` - Get conversation statistics
- **GET** `/api/logs?action=history&sessionId=<id>` - Get conversation history
- **GET** `/api/logs?action=search&search=<term>` - Search conversations
- **POST** `/api/logs` - Initialize database tables

## 🎯 Admin Interface

### Access Logs
Visit `/admin/logs` to view:
- **Statistics Dashboard**: Total conversations, messages, token usage
- **Conversation History**: View specific session conversations
- **Search Conversations**: Find conversations by content

### Initialize Database
Click the "Initialize Database" button on the admin page to set up tables.

## 🧪 Testing the System

### Test Page
Visit `/test-logging` to:
- Send test messages to the chatbot
- Verify logging is working
- Test session management

### Test Flow
1. Send a message via `/test-logging`
2. Check `/admin/logs` for the new conversation
3. Verify statistics are updated
4. Search for your test message

## 🔒 Privacy & Security

### Data Collected
- **Session IDs**: Anonymous identifiers
- **IP Addresses**: For abuse prevention
- **User Agents**: For debugging
- **Message Content**: Full prompts and responses

### Data Retention
- **All data is stored indefinitely** (as requested)
- **No automatic deletion** implemented
- **Manual cleanup** available through admin interface

## 📈 Analytics & Insights

### Available Metrics
- **Usage Patterns**: Peak usage times, popular topics
- **Document Effectiveness**: Which documents are most referenced
- **User Engagement**: Conversation length, follow-up questions
- **Performance**: Token usage, response quality

### Export Capabilities
- **Raw Data**: Access via API endpoints
- **Statistics**: Dashboard metrics
- **Search Results**: Filtered conversation data

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check environment variables
echo $POSTGRES_URL

# Verify database is running in Vercel dashboard
# Check if database is in same region as your app
```

#### Tables Not Created
```bash
# Visit /admin/logs and click "Initialize Database"
# Check browser console for errors
# Verify database permissions
```

#### Logging Not Working
```bash
# Check browser console for errors
# Verify ChatLogger import in chat route
# Check if database service is accessible
```

### Debug Mode
Enable debug logging by checking browser console and server logs.

## 🔄 Updating the System

### Adding New Fields
1. **Update database schema** in `src/lib/database-schema.sql`
2. **Modify database service** in `src/lib/database.ts`
3. **Update logging service** in `src/lib/chat-logger.ts`
4. **Redeploy** your application

### Scaling Considerations
- **Hobby tier**: 256MB storage, ~100k conversations
- **Pro tier**: 8GB storage, ~3M conversations
- **Enterprise**: Unlimited storage

## 📚 File Structure

```
src/
├── lib/
│   ├── database.ts              # Database service
│   ├── chat-logger.ts           # Logging service
│   └── database-schema.sql      # Database schema
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # Chat endpoint (updated)
│   │   └── logs/route.ts        # Logs management API
│   ├── admin/
│   │   └── logs/page.tsx        # Admin interface
│   └── test-logging/page.tsx    # Testing page
```

## 🎉 Next Steps

1. **Set up Vercel Postgres** database
2. **Deploy** your updated application
3. **Initialize** database tables via admin interface
4. **Test** logging with `/test-logging` page
5. **Monitor** logs via `/admin/logs`
6. **Analyze** conversation patterns and insights

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review browser console and server logs
3. Verify database connection in Vercel dashboard
4. Check environment variables are set correctly

---

**Happy Logging! 🚀**
