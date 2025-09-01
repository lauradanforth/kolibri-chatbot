'use client';

import { useState } from 'react';
import { findRelevantSections, getAllSections } from '@/lib/kolibri-guide-sections';

export default function TestSmartLinkingPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);

  const testQuery = () => {
    if (query.trim()) {
      const relevantSections = findRelevantSections(query);
      setResults({
        query,
        relevantSections,
        allSections: getAllSections()
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Smart Linking System Test</h1>
      
      <div className="space-y-6">
        {/* Test Query Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Test Smart Linking</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter a query (e.g., 'installation', 'user management')"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={testQuery}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
            >
              Test Query
            </button>
          </div>
          
          {results && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800">Query Results:</h3>
              <div className="mt-2 space-y-2">
                <p><strong>Query:</strong> {results.query}</p>
                <p><strong>Relevant Sections Found:</strong> {results.relevantSections.length}</p>
                
                {results.relevantSections.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-green-700">Relevant Sections:</h4>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {results.relevantSections.map((section: any) => (
                        <li key={section.id} className="text-green-600">
                          <strong>{section.title}</strong> - {section.description}
                          <br />
                          <span className="text-sm text-green-500">Topics: {section.topics.join(', ')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* All Sections Display */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">All Available Sections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getAllSections().map((section) => (
              <div key={section.id} className="border border-gray-200 rounded-md p-4">
                <h3 className="font-semibold text-lg mb-2">{section.title}</h3>
                <p className="text-gray-600 mb-2">{section.description}</p>
                <p className="text-sm text-gray-500 mb-2">
                  <strong>Topics:</strong> {section.topics.join(', ')}
                </p>
                <a
                  href={section.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View Documentation →
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
