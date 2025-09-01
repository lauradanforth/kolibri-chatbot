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

  // Function to parse markdown links and make them clickable
  const parseMarkdownLinks = (text: string) => {
    // Match markdown links: [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add the clickable link
      parts.push(
        <a
          key={`link-${match.index}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {match[1]}
        </a>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last link
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

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
          messages: [userMessage], // Send only current message to avoid conversation context issues
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
            {/* Kolibri WIZARD Logo */}
            <div className="flex justify-center items-center mb-6">
              <img 
                src="/kolibri-logo.png" 
                alt="Kolibri WIZARD Logo" 
                className="h-24 w-auto"
              />
            </div>
            
            <p>Welcome! I'm here to help you get started with using Kolibri.</p>
            <p className="mt-2">Try asking me something like:</p>
            <div className="mt-4 flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => setInput("What assessment types are available in Kolibri?")}
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
              >
                What assessment types are available in Kolibri?
              </button>
              <button
                onClick={() => setInput("What hardware is needed for Kolibri?")}
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
              >
                What hardware is needed for Kolibri?
              </button>
              <button
                onClick={() => setInput("How can I train others on using Kolibri?")}
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
              >
                How can I train others on using Kolibri?
              </button>
              <button
                onClick={() => setInput("Tell me about learner data syncing in Kolibri")}
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
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
                  // Style training resources section
                  if (line.includes('🎯 **Training Resources Available:**')) {
                    return (
                      <div key={index} className="bg-green-50 border-l-4 border-green-400 p-3 mb-3 rounded-r">
                        <p className="font-semibold text-green-900 mb-2">{line}</p>
                      </div>
                    );
                  }
                  // Style language resources section
                  if (line.includes('🌍 **Multilingual Toolkit Available:**')) {
                    return (
                      <div key={index} className="bg-purple-50 border-l-4 border-purple-400 p-3 mb-3 rounded-r">
                        <p className="font-semibold text-purple-900 mb-2">{line}</p>
                      </div>
                    );
                  }
                  // Style toolkit resources section
                  if (line.includes('📚 **Kolibri Edtech Toolkit v4:**')) {
                    return (
                      <div key={index} className="bg-indigo-50 border-l-4 border-indigo-400 p-3 mb-3 rounded-r">
                        <p className="font-semibold text-indigo-900 mb-2">{line}</p>
                      </div>
                    );
                  }
                  // Style download resources section
                  if (line.includes('💾 **Download Kolibri:**')) {
                    return (
                      <div key={index} className="bg-teal-50 border-l-4 border-teal-400 p-3 mb-3 rounded-r">
                        <p className="font-semibold text-teal-900 mb-2">{line}</p>
                      </div>
                    );
                  }
                  // Style download content (links and platform info)
                  if (line.includes('🔗 Official Download Page:') || 
                      line.includes('📱 Available Platforms:') ||
                      line.includes('🌍 Language Support:')) {
                    return (
                      <div key={index} className="bg-teal-50 border-l-4 border-teal-400 p-3 mb-3 rounded-r">
                        <p className="text-teal-800 mb-2">{parseMarkdownLinks(line)}</p>
                      </div>
                    );
                  }
                  // Style resource/library section
                  if (line.includes('📚 **Kolibri Library & Resources:**')) {
                    return (
                      <div key={index} className="bg-orange-50 border-l-4 border-orange-400 p-3 mb-3 rounded-r">
                        <p className="font-semibold text-orange-900 mb-2">{line}</p>
                      </div>
                    );
                  }
                  // Style Studio/curation section
                  if (line.includes('🎨 **Kolibri Studio - Content Creation & Curation:**')) {
                    return (
                      <div key={index} className="bg-pink-50 border-l-4 border-pink-400 p-3 mb-3 rounded-r">
                        <p className="font-semibold text-pink-900 mb-2">{line}</p>
                      </div>
                    );
                  }
                  // Style feedback/community section
                  if (line.includes('💬 **Community Engagement & Feedback:**')) {
                    return (
                      <div key={index} className="bg-emerald-50 border-l-4 border-emerald-400 p-3 mb-3 rounded-r">
                        <p className="font-semibold text-emerald-900 mb-2">{line}</p>
                      </div>
                    );
                  }
                  // Style bug report section
                  if (line.includes('🐛 **Bug Report & Issue Tracking:**')) {
                    return (
                      <div key={index} className="bg-red-50 border-l-4 border-red-400 p-3 mb-3 rounded-r">
                        <p className="font-semibold text-red-900 mb-2">{line}</p>
                      </div>
                    );
                  }
                  // Style technical support section
                  if (line.includes('🔧 **Technical Support & Assistance:**')) {
                    return (
                      <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3 rounded-r">
                        <p className="font-semibold text-blue-900 mb-2">{line}</p>
                      </div>
                    );
                  }
                  // Style demo section
                  if (line.includes('🎮 **Kolibri Demo & Exploration:**')) {
                    return (
                      <div key={index} className="bg-violet-50 border-l-4 border-violet-400 p-3 mb-3 rounded-r">
                        <p className="font-semibold text-violet-900 mb-2">{line}</p>
                      </div>
                    );
                  }
                  // Style user guide section
                  if (line.includes('📖 **Kolibri User Guide & Documentation:**')) {
                    return (
                      <div key={index} className="bg-amber-50 border-l-4 border-amber-400 p-3 mb-3 rounded-r">
                        <p className="font-semibold text-amber-900 mb-2">{line}</p>
                      </div>
                    );
                  }
                  // Style the training pack folder link specifically
                  if (line.includes('📁 Kolibri Training Pack') && line.includes('[Open Training Folder]')) {
                    return (
                      <div key={index} className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3 rounded-r">
                        <p className="font-semibold text-yellow-800 mb-2">
                          {parseMarkdownLinks(line)}
                        </p>
                      </div>
                    );
                  }
                  // Style the multilingual toolkit folder link specifically
                  if (line.includes('📁 Kolibri Edtech Toolkit v4') && line.includes('[Open Multilingual Folder]')) {
                    return (
                      <div key={index} className="bg-purple-50 border-l-4 border-purple-400 p-3 mb-3 rounded-r">
                        <p className="font-semibold text-purple-800 mb-2">
                          {parseMarkdownLinks(line)}
                        </p>
                      </div>
                    );
                  }
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
                        {parseMarkdownLinks(line)}
                      </p>
                    );
                  }
                  // Style separator line
                  if (line.includes('---')) {
                    return <hr key={index} className="my-3 border-gray-300" />;
                  }
                  // Regular text with markdown link parsing
                  return <p key={index} className="mb-1">{parseMarkdownLinks(line)}</p>;
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
