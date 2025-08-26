'use client';

import { useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ErrorResponse {
  error: string;
  message: string;
  availableTopics?: string[];
  details?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        // Handle error responses
        const errorData: ErrorResponse = await response.json();
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `❌ **${errorData.error}**\n\n${errorData.message}\n\n${errorData.availableTopics ? `**Available topics:**\n${errorData.availableTopics.map(topic => `• ${topic}`).join('\n')}` : ''}`,
          },
        ]);
        return;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };

      setMessages(prev => [...prev, assistantMessage]);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        fullText += chunk;
        
        // Update the message with the accumulated text
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: fullText }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '❌ **Error**\n\nSorry, I encountered an error while trying to access the Kolibri documentation. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Getting Started with Kolibri Chatbot</h1>
        <p className="text-gray-600 mt-1">Ask me anything about Kolibri! (Document-based responses only)</p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p>Welcome! I'm here to help you get started with using Kolibri.</p>
            <p className="mt-2">Try asking me something like:</p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => setInput("What assessment types are available in Kolibri?")}
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                What assessment types are available in Kolibri?
              </button>
              <button
                onClick={() => setInput("What hardware is needed for Kolibri?")}
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                What hardware is needed for Kolibri?
              </button>
              <button
                onClick={() => setInput("What is an example of Project Based Learning with Kolibri?")}
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                What is an example of Project Based Learning with Kolibri?
              </button>
              <button
                onClick={() => setInput("Tell me about learner data syncing in Kolibri")}
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Tell me about learner data syncing in Kolibri
              </button>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              💡 I only respond with information from documentation created by the Learning Equality team
            </p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none">
                {message.content.split('\n').map((line, index) => {
                  // Style document references section
                  if (line.includes('📚 **Documents Referenced:**')) {
                    return (
                      <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3 rounded-r">
                        <p className="font-semibold text-blue-900 mb-2">{line}</p>
                      </div>
                    );
                  }
                  // Style document links
                  if (line.includes('• **') && line.includes('[View Document]')) {
                    return (
                      <p key={index} className="text-blue-700 hover:text-blue-900 mb-1">
                        {line}
                      </p>
                    );
                  }
                  // Style separator line
                  if (line.includes('---')) {
                    return <hr key={index} className="my-3 border-gray-300" />;
                  }
                  // Regular text
                  return <p key={index} className="mb-1">{line}</p>;
                })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 text-gray-900 px-4 py-2 rounded-lg">
              <p className="text-sm">🔍 Searching documents...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Kolibri documentation..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
