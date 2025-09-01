'use client';

import { useState } from 'react';

export default function TestDownloadPage() {
  const [testResponse] = useState(`
💾 **Download Kolibri:**

**🔗 Official Download Page:** [Download Kolibri](https://learningequality.org/download/) - Get the latest version for your platform

**📱 Available Platforms:**
• **Windows** - .exe installer with launcher and tray icon
• **Ubuntu/Debian** - .deb package with automatic updates
• **Raspberry Pi** - Configure as server and hotspot
• **MacOS** - Stand-alone app (not for server use)
• **Python** - Portable executable for Python 3.6+

**🌍 Language Support:** Available in 30+ languages including English, Arabic, French, Hindi, Spanish, Swahili, and more

---
`);

  const parseMarkdownLinks = (text: string) => {
    // Simple markdown link parser
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add the link
      parts.push(
        <a
          key={match.index}
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

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderLine = (line: string, index: number) => {
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

    // Style separator line
    if (line.includes('---')) {
      return <hr key={index} className="my-3 border-gray-300" />;
    }

    // Regular text with markdown link parsing
    return <p key={index} className="mb-1">{parseMarkdownLinks(line)}</p>;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Download Response Styling Test</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Test Download Response</h2>
        
        <div className="bg-gray-50 p-4 rounded-md">
          {testResponse.split('\n').map((line, index) => 
            line.trim() ? renderLine(line, index) : null
          )}
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-semibold text-blue-800">Expected Behavior:</h3>
          <ul className="list-disc list-inside mt-2 text-blue-700">
            <li>Download header should have teal background and border</li>
            <li>Download link should be clickable and open in new tab</li>
            <li>Platform info should have teal background</li>
            <li>Language support should have teal background</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
