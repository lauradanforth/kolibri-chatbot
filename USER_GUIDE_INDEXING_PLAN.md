# Kolibri User Guide Vector Indexing Plan

## 🎯 **Overview**

This plan outlines how to enhance the Kolibri chatbot by indexing the [Kolibri User Guide](https://kolibri.readthedocs.io/en/latest/index.html) for vector search, replacing the current keyword-based approach with semantic search capabilities.

## 🚀 **Current State vs. Target State**

### **Current Implementation**
- **Google Drive Documents**: 539 chunks indexed with vector search ✅
- **User Guide**: Keyword-based pattern matching (limited effectiveness) ⚠️
- **Search Quality**: Good for Google Drive, poor for User Guide sections

### **Target Implementation**
- **Google Drive Documents**: 539 chunks indexed with vector search ✅
- **User Guide**: Full content indexed with vector search 🎯
- **Search Quality**: Excellent semantic matching across both sources

## 📋 **Phase 1: Document Discovery & Structure Analysis**

### **1.1 Map the Documentation Structure**
Based on the [Kolibri User Guide](https://kolibri.readthedocs.io/en/latest/index.html), we need to index:

- **Install Kolibri** (8 sub-sections)
  - Hardware requirements
  - Windows, Debian/Ubuntu, Raspberry Pi, MacOS, Python, Android
  - Initial setup
- **Access Kolibri** (5 sub-sections)
  - Windows, Linux, Raspberry Pi, MacOS
  - Accessing Kolibri server from client devices
- **Manage Kolibri** (12 sub-sections)
  - Default user roles, Change language, Facility, Users, Classes
  - Data, Channels and resources, Device, Permissions, Facilities
  - Device info, Troubleshooting
- **Advanced Management** (4 sub-sections)
  - Command line usage, Customize settings, Performance testing
  - Hard drive provisioning
- **Coach your learners** (4 sub-sections)
  - Lessons, Quizzes, Learners, Groups
- **Learn with Kolibri**
- **FAQ & Glossary**

### **1.2 Content Extraction Strategy**
- **Primary Method**: Web scraping with respect for rate limits
- **Alternative**: Use ReadTheDocs API if available
- **Fallback**: Manual content collection for key sections

## 🔧 **Phase 2: Content Extraction & Processing**

### **2.1 Web Scraping Implementation**
```typescript
// New service: src/lib/kolibri-docs-scraper.ts
interface KolibriDocSection {
  id: string;
  title: string;
  url: string;
  content: string;
  parentSection: string;
  metadata: {
    lastUpdated: string;
    wordCount: number;
    topics: string[];
  };
}
```

### **2.2 Content Processing Pipeline**
1. **Fetch HTML** from each documentation page
2. **Extract clean text** (remove navigation, headers, footers)
3. **Parse markdown** if available
4. **Chunk content** into searchable segments (similar to current 539 chunks)
5. **Generate embeddings** for each chunk

### **2.3 Chunking Strategy**
- **Target chunk size**: 1000-2000 characters (similar to Google Drive chunks)
- **Overlap**: 200-300 characters between chunks for context continuity
- **Section boundaries**: Respect natural section breaks
- **Metadata preservation**: Maintain source URL, section hierarchy

## 🗄️ **Phase 3: Vector Index Integration**

### **3.1 Extend Current Index Structure**
```typescript
// Update: src/lib/ai-sdk-vector-search.ts
interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: 'google-drive' | 'kolibri-user-guide';
    documentId: string;
    section: string;
    url?: string;
    title: string;
    parentSection?: string;
    chunkIndex: number;
    totalChunks: number;
  };
  embedding: number[];
}
```

### **3.2 Index Management**
- **Separate indices** for Google Drive vs User Guide
- **Unified search** across both sources
- **Source attribution** in search results
- **Update mechanism** for when docs change
- **Version control** for documentation updates

### **3.3 Expected Index Growth**
- **Current**: 539 chunks (Google Drive only)
- **After User Guide**: ~800-1000 total chunks
- **Storage**: Minimal increase (embeddings are lightweight)
- **Performance**: Slight increase in search time, but better results

## 🔍 **Phase 4: Search Enhancement**

### **4.1 Hybrid Search Strategy**
```typescript
// Enhanced search combining both sources
async function enhancedSearch(query: string) {
  const [googleResults, userGuideResults] = await Promise.all([
    searchGoogleDriveDocs(query),
    searchUserGuideDocs(query)
  ]);
  
  return combineAndRankResults(googleResults, userGuideResults);
}
```

### **4.2 Result Ranking & Deduplication**
- **Semantic similarity** scoring across both sources
- **Source diversity** (prefer results from both sources)
- **Content freshness** (prioritize recent documentation)
- **Relevance filtering** (remove low-quality matches)
- **Context preservation** (maintain chunk relationships)

### **4.3 Search Quality Improvements**
- **Better semantic matching** for User Guide content
- **Reduced false negatives** from keyword search limitations
- **Improved context understanding** through vector similarity
- **Source-aware ranking** (balance between sources)

## 🛠️ **Phase 5: Implementation Steps**

### **5.1 Create Documentation Scraper**
```bash
# New files to create:
src/lib/kolibri-docs-scraper.ts     # Web scraping service
src/lib/kolibri-docs-processor.ts   # Content processing
src/scripts/index-user-guide.ts     # Indexing script
```

### **5.2 Update Search Infrastructure**
```bash
# Files to modify:
src/lib/ai-sdk-vector-search.ts     # Add User Guide search
src/app/api/chat/route.ts           # Integrate both sources
src/lib/kolibri-guide-sections.ts   # Deprecate keyword search
```

### **5.3 Indexing Process**
```bash
# Run indexing:
npm run index:user-guide            # New script
npm run index:all                   # Index both sources
npm run index:update                # Update existing indices
```

### **5.4 Environment Configuration**
```bash
# New environment variables:
KOLIBRI_DOCS_BASE_URL=https://kolibri.readthedocs.io/en/latest/
KOLIBRI_DOCS_SCRAPE_DELAY=1000     # 1 second between requests
KOLIBRI_DOCS_MAX_PAGES=50          # Limit total pages to scrape
KOLIBRI_DOCS_CHUNK_SIZE=1500       # Target chunk size in characters
```

## ✅ **Phase 6: Quality Assurance**

### **6.1 Content Validation**
- **Accuracy check** against original docs
- **Completeness** verification
- **Link validation** (ensure URLs work)
- **Content freshness** monitoring
- **Chunk quality** assessment

### **6.2 Search Quality Testing**
- **Query testing** with known good answers
- **Result ranking** validation
- **Source attribution** accuracy
- **Performance benchmarking**
- **A/B testing** against current keyword search

### **6.3 Test Queries to Validate**
- "How do I install Kolibri on Windows?"
- "What are the user roles in Kolibri?"
- "How do I create lessons for students?"
- "What command line options are available?"
- "How do I troubleshoot network issues?"

## 🚀 **Phase 7: Deployment & Monitoring**

### **7.1 Production Deployment**
- **Environment variables** for scraping settings
- **Rate limiting** to respect ReadTheDocs
- **Error handling** for failed scrapes
- **Monitoring** for index health
- **Rollback plan** if issues arise

### **7.2 Maintenance Strategy**
- **Scheduled re-indexing** (weekly/monthly)
- **Change detection** for documentation updates
- **Performance monitoring** for search quality
- **User feedback** collection
- **Index optimization** based on usage patterns

### **7.3 Monitoring Metrics**
- **Search response time** (target: <2 seconds)
- **Result relevance** (user satisfaction scores)
- **Index health** (chunk count, embedding quality)
- **Error rates** (scraping failures, search errors)
- **User engagement** (query patterns, result clicks)

## 🎯 **Expected Benefits**

### **Immediate Improvements**
1. **Better Semantic Matching**: Vector search finds conceptually related content
2. **Comprehensive Coverage**: Both internal docs and official User Guide
3. **Improved Accuracy**: More relevant results for user queries
4. **Source Diversity**: Users get both practical and official information

### **Long-term Benefits**
1. **Scalability**: Can handle more documentation as it grows
2. **Maintainability**: Easier to update and manage indices
3. **User Experience**: More intuitive and helpful responses
4. **Knowledge Discovery**: Users find related information they didn't know to ask for

## ⚠️ **Considerations & Risks**

### **Technical Risks**
- **Rate Limiting**: Respect ReadTheDocs scraping policies
- **Content Updates**: Handle documentation changes gracefully
- **Index Size**: Monitor vector database performance
- **Scraping Reliability**: Handle network failures and content changes

### **Legal & Ethical Considerations**
- **Terms of Service**: Ensure scraping follows ReadTheDocs policies
- **Rate Limiting**: Be respectful of their servers
- **Content Attribution**: Properly credit original sources
- **Data Usage**: Only use content for intended educational purposes

### **Performance Considerations**
- **Index Size**: Monitor memory usage as index grows
- **Search Speed**: Balance between result quality and response time
- **Storage**: Plan for index growth and backup strategies
- **Updates**: Handle re-indexing without service disruption

## 📊 **Success Metrics**

### **Quantitative Metrics**
- **Search Response Time**: <2 seconds average
- **Result Relevance**: >80% user satisfaction
- **Coverage**: 100% of User Guide sections indexed
- **Index Health**: <1% failed chunks or embeddings

### **Qualitative Metrics**
- **User Feedback**: Positive sentiment in user interactions
- **Query Understanding**: Better handling of natural language
- **Source Balance**: Appropriate mix of Google Drive and User Guide results
- **Content Freshness**: Up-to-date information from both sources

## 🔄 **Migration Timeline**

### **Week 1-2: Planning & Setup**
- Finalize technical approach
- Set up development environment
- Create project structure

### **Week 3-4: Core Development**
- Implement web scraper
- Build content processor
- Create indexing pipeline

### **Week 5-6: Integration & Testing**
- Integrate with existing search
- Test search quality
- Validate content accuracy

### **Week 7-8: Deployment & Monitoring**
- Deploy to production
- Monitor performance
- Collect user feedback

### **Week 9-10: Optimization & Iteration**
- Address feedback
- Optimize performance
- Plan future enhancements

## 📚 **Resources & References**

- [Kolibri User Guide](https://kolibri.readthedocs.io/en/latest/index.html)
- [ReadTheDocs API Documentation](https://docs.readthedocs.io/en/stable/api/)
- [Current Vector Search Implementation](src/lib/ai-sdk-vector-search.ts)
- [Existing Guide Sections](src/lib/kolibri-guide-sections.ts)

## 🎯 **Implementation Status**

### ✅ **Completed**
1. **Document Discovery & Structure Analysis** - ✅ Complete
2. **Content Extraction & Processing** - ✅ Complete
3. **Web Scraping Implementation** - ✅ Complete
4. **Content Chunking** - ✅ Complete (433 chunks created)
5. **Parallelized Embedding Generation** - ✅ Complete
6. **Vector Search Integration** - ✅ Complete
7. **Hybrid Search System** - ✅ Complete

### 🚀 **Ready for Execution**
- **Indexing Script**: `npm run index:user-guide`
- **Embedding Generation**: `npm run generate:embeddings`
- **Complete Setup**: `npm run setup:complete`

### 📊 **Current Results**
- **Total Pages Indexed**: 42 pages from Kolibri User Guide
- **Total Chunks Created**: 433 searchable chunks
- **Total Content**: 241,126 characters
- **Average Chunk Size**: 557 characters
- **Search Sources**: Google Drive (vector) + User Guide (hybrid vector/keyword)

## 🎯 **Next Steps**

1. **Run complete setup**: `npm run setup:complete`
2. **Test vector search** with User Guide content
3. **Monitor search quality** and performance
4. **Optimize chunking** if needed
5. **Plan future enhancements**

---

*Last Updated: [Current Date]*
*Status: Planning Phase*
*Assigned To: Development Team*
