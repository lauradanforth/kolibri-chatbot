'use client';

import { useState } from 'react';

export default function TestLoggingPage() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');

  const sendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setResponse('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          sessionId: sessionId || undefined
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullResponse += chunk;
        setResponse(fullResponse);
      }

      // Generate a new session ID for the next message
      if (!sessionId) {
        setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      }

    } catch (error) {
      console.error('Error:', error);
      setResponse('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const clearSession = () => {
    setSessionId('');
    setResponse('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Chat Logging</h1>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session ID (optional - will be generated if empty)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session ID or leave empty to generate"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={clearSession}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!message.trim() || loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 mb-6"
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>

          {response && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Response:</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <pre className="whitespace-pre-wrap text-gray-800">{response}</pre>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="font-medium text-blue-900 mb-2">How to test logging:</h3>
            <ol className="list-decimal list-inside text-blue-800 space-y-1">
              <li>Send a message using the form above</li>
              <li>Check the admin logs page at <code className="bg-blue-100 px-1 rounded">/admin/logs</code></li>
              <li>Look for your conversation in the statistics and search</li>
              <li>Try using the same session ID for multiple messages</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
