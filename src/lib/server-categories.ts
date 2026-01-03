/**
 * Server category classification based on description keywords
 */

export type ServerCategory = 'database' | 'search' | 'code' | 'web' | 'ai' | 'data' | 'tools' | 'other'

/**
 * Category keyword mappings
 * Order matters - first match wins
 */
const categoryKeywords: Record<ServerCategory, string[]> = {
  database: [
    'database', 'db', 'sql', 'postgres', 'postgresql', 'mysql', 'mongodb', 
    'redis', 'sqlite', 'cassandra', 'dynamodb', 'couchdb', 'neo4j'
  ],
  search: [
    'search', 'query', 'index', 'elasticsearch', 'vector', 'semantic', 
    'full-text', 'fuzzy', 'lucene', 'solr'
  ],
  code: [
    'code', 'github', 'git', 'repository', 'programming', 'developer', 
    'source', 'commit', 'pull request', 'issue', 'syntax', 'parse'
  ],
  web: [
    'web', 'http', 'api', 'rest', 'fetch', 'request', 'endpoint', 
    'url', 'browser', 'scrape', 'crawl', 'html', 'json'
  ],
  ai: [
    'ai', 'ml', 'machine learning', 'model', 'llm', 'gpt', 'openai', 
    'anthropic', 'claude', 'neural', 'deep learning', 'nlp', 'natural language'
  ],
  data: [
    'data', 'analytics', 'process', 'transform', 'etl', 'csv', 'json', 
    'parquet', 'pipeline', 'aggregate', 'statistics'
  ],
  tools: [
    'tool', 'utility', 'helper', 'automation', 'workflow', 'script', 
    'cli', 'command', 'task', 'scheduler'
  ],
  other: [] // Default fallback
}

/**
 * Categorize a server based on its description
 * @param description - Server description text
 * @returns Category name, defaults to 'other' if no match
 */
export function categorizeServer(description: string | null): ServerCategory {
  if (!description) {
    return 'other'
  }

  const lowerDescription = description.toLowerCase()

  // Check each category (excluding 'other')
  const categories: ServerCategory[] = ['database', 'search', 'code', 'web', 'ai', 'data', 'tools']
  
  for (const category of categories) {
    const keywords = categoryKeywords[category]
    for (const keyword of keywords) {
      if (lowerDescription.includes(keyword)) {
        return category
      }
    }
  }

  return 'other'
}

/**
 * Get display name for a category
 */
export function getCategoryDisplayName(category: ServerCategory): string {
  const displayNames: Record<ServerCategory, string> = {
    database: 'Database',
    search: 'Search',
    code: 'Code',
    web: 'Web',
    ai: 'AI',
    data: 'Data',
    tools: 'Tools',
    other: 'Other'
  }
  return displayNames[category]
}

/**
 * Get all categories (excluding 'other' for filtering)
 */
export function getCategories(): ServerCategory[] {
  return ['database', 'search', 'code', 'web', 'ai', 'data', 'tools', 'other']
}


