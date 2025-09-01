export interface KolibriGuideSection {
  id: string;
  title: string;
  url: string;
  description: string;
  topics: string[];
}

export const kolibriGuideSections: Record<string, KolibriGuideSection> = {
  'installation': {
    id: 'installation',
    title: 'Installation & Setup',
    url: 'https://kolibri.readthedocs.io/en/latest/install.html',
    description: 'Installation instructions for different platforms',
    topics: ['Windows', 'Mac', 'Linux', 'Raspberry Pi', 'Android', 'Python', 'hardware requirements']
  },
  'getting-started': {
    id: 'getting-started',
    title: 'Getting Started',
    url: 'https://kolibri.readthedocs.io/en/latest/getting-started.html',
    description: 'Initial setup and basic configuration',
    topics: ['first run', 'facility setup', 'user roles', 'basic configuration']
  },
  'user-management': {
    id: 'user-management',
    title: 'User Management',
    url: 'https://kolibri.readthedocs.io/en/latest/user-management.html',
    description: 'Managing users, classes, and permissions',
    topics: ['create users', 'manage classes', 'user roles', 'permissions', 'bulk operations']
  },
  'content-management': {
    id: 'content-management',
    title: 'Content Management',
    url: 'https://kolibri.readthedocs.io/en/latest/content-management.html',
    description: 'Importing and organizing educational content',
    topics: ['import channels', 'organize resources', 'content structure', 'resource management']
  },
  'teaching-tools': {
    id: 'teaching-tools',
    title: 'Teaching Tools',
    url: 'https://kolibri.readthedocs.io/en/latest/teaching-tools.html',
    description: 'Creating lessons, quizzes, and tracking progress',
    topics: ['create lessons', 'build quizzes', 'assign content', 'track progress', 'learner groups']
  },
  'facilities': {
    id: 'facilities',
    title: 'Facilities & Data Management',
    url: 'https://kolibri.readthedocs.io/en/latest/manage/facilities.html',
    description: 'Managing facilities, importing/syncing data, and data portal integration',
    topics: ['facilities', 'import facility', 'sync facility', 'data sync', 'learner progress', 'offline learning', 'roving admin', 'network sync', 'learner data', 'progress tracking', 'sync data', 'kolibri data portal', 'kdp']
  },
  'device-management': {
    id: 'device-management',
    title: 'Device Management',
    url: 'https://kolibri.readthedocs.io/en/latest/device-management.html',
    description: 'Device settings and network configuration',
    topics: ['device settings', 'network access', 'storage management', 'system configuration']
  },
  'advanced-management': {
    id: 'advanced-management',
    title: 'Advanced Management',
    url: 'https://kolibri.readthedocs.io/en/latest/advanced-management.html',
    description: 'Command line usage and advanced configuration',
    topics: ['command line', 'performance testing', 'custom settings', 'advanced configuration']
  },
  'troubleshooting': {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    url: 'https://kolibri.readthedocs.io/en/latest/troubleshooting.html',
    description: 'Common issues and solutions',
    topics: ['common problems', 'error messages', 'network issues', 'performance issues']
  }
};

/**
 * Find relevant sections based on user query
 */
export function findRelevantSections(query: string): KolibriGuideSection[] {
  const queryLower = query.toLowerCase();
  const relevantSections: KolibriGuideSection[] = [];
  
  console.log(`🔍 Searching guide sections for: "${query}"`);
  console.log(`🔍 Available sections:`, Object.keys(kolibriGuideSections));
  
  for (const [key, section] of Object.entries(kolibriGuideSections)) {
    console.log(`🔍 Checking section: ${key} - "${section.title}"`);
    
    // Check if query matches section title, description, or topics
    const matchesTitle = section.title.toLowerCase().includes(queryLower);
    const matchesDescription = section.description.toLowerCase().includes(queryLower);
    const matchesTopics = section.topics.some(topic => 
      topic.toLowerCase().includes(queryLower)
    );
    
    console.log(`🔍   Title match: ${matchesTitle}`);
    console.log(`🔍   Description match: ${matchesDescription}`);
    console.log(`🔍   Topics match: ${matchesTopics}`);
    
    if (matchesTitle || matchesDescription || matchesTopics) {
      console.log(`🔍   ✓ Adding section: ${section.title}`);
      relevantSections.push(section);
    }
  }
  
  console.log(`🔍 Total relevant sections found: ${relevantSections.length}`);
  return relevantSections.slice(0, 3); // Return top 3 most relevant
}

/**
 * Get section by ID
 */
export function getSectionById(id: string): KolibriGuideSection | undefined {
  return kolibriGuideSections[id];
}

/**
 * Get all sections
 */
export function getAllSections(): KolibriGuideSection[] {
  return Object.values(kolibriGuideSections);
}
