'use client';

import { useState, useEffect } from 'react';

interface ConversationStats {
  total_conversations: number;
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  avg_tokens_per_message: number;
  first_conversation: string;
  latest_conversation: string;
}

interface ConversationHistory {
  conversation_id: number;
  conversation_start: string;
  role: string;
  content: string;
  message_time: string;
  tokens_used: number;
  model_used: string;
}

interface SearchResult {
  conversation_id: number;
  session_id: string;
  created_at: string;
  content: string;
  role: string;
}

export default function LogsPage() {
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [history, setHistory] = useState<ConversationHistory[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'search'>('stats');

  // Load conversation statistics
  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/logs?action=stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load conversation history
  const loadHistory = async () => {
    if (!sessionId.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/logs?action=history&sessionId=${encodeURIComponent(sessionId)}`);
      const data = await response.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search conversations
  const searchConversations = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/logs?action=search&search=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (error) {
      console.error('Failed to search conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize database
  const initializeDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' })
      });
      const data = await response.json();
      if (data.success) {
        alert('Database initialized successfully!');
        loadStats();
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      alert('Failed to initialize database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats();
    }
  }, [activeTab]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Chat Logs Admin</h1>
            <p className="text-gray-600">View and analyze chatbot conversations</p>
          </div>

          {/* Database Initialization */}
          <div className="px-6 py-4 border-b border-gray-200">
            <button
              onClick={initializeDatabase}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
            >
              {loading ? 'Initializing...' : 'Initialize Database'}
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Run this once to set up the database tables
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'stats', label: 'Statistics' },
                { id: 'history', label: 'Conversation History' },
                { id: 'search', label: 'Search Conversations' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'stats' && stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900">Total Conversations</h3>
                  <p className="text-3xl font-bold text-blue-600">{stats.total_conversations}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-900">Total Messages</h3>
                  <p className="text-3xl font-bold text-green-600">{stats.total_messages}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900">User Messages</h3>
                  <p className="text-3xl font-bold text-purple-600">{stats.user_messages}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-orange-900">Assistant Messages</h3>
                  <p className="text-3xl font-bold text-orange-600">{stats.assistant_messages}</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg col-span-2">
                  <h3 className="text-lg font-semibold text-indigo-900">Average Tokens per Message</h3>
                  <p className="text-3xl font-bold text-indigo-600">
                    {stats.avg_tokens_per_message ? Math.round(stats.avg_tokens_per_message) : 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900">Date Range</h3>
                  <p className="text-sm text-gray-600">
                    {stats.first_conversation && formatDate(stats.first_conversation)} - {stats.latest_conversation && formatDate(stats.latest_conversation)}
                  </p>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div>
                <div className="flex gap-4 mb-6">
                  <input
                    type="text"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="Enter session ID"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={loadHistory}
                    disabled={!sessionId.trim() || loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
                  >
                    Load History
                  </button>
                </div>
                
                {history.length > 0 && (
                  <div className="space-y-4">
                    {history.map((msg, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            msg.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {msg.role}
                          </span>
                          <span className="text-xs text-gray-500">{formatDate(msg.message_time)}</span>
                        </div>
                        <p className="text-gray-900">{msg.content}</p>
                        {msg.tokens_used && (
                          <p className="text-xs text-gray-500 mt-2">Tokens: {msg.tokens_used}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <div>
                <div className="flex gap-4 mb-6">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Enter search term"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={searchConversations}
                    disabled={!searchTerm.trim() || loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
                  >
                    Search
                  </button>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="space-y-4">
                    {searchResults.map((result, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            result.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {result.role}
                          </span>
                          <span className="text-xs text-gray-500">{formatDate(result.created_at)}</span>
                        </div>
                        <p className="text-gray-900">{formatContent(result.content, 200)}</p>
                        <p className="text-xs text-gray-500 mt-2">Session: {result.session_id}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
