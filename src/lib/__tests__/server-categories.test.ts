import { describe, it, expect } from 'vitest'
import {
  categorizeServer,
  getCategoryDisplayName,
  getCategories,
} from '../server-categories'

describe('categorizeServer', () => {
  it('categorizes database servers', () => {
    expect(categorizeServer('A PostgreSQL database server')).toBe('database')
    expect(categorizeServer('MySQL database connector')).toBe('database')
    expect(categorizeServer('Redis cache server')).toBe('database')
    expect(categorizeServer('MongoDB integration')).toBe('database')
  })

  it('categorizes search servers', () => {
    expect(categorizeServer('Full-text search engine')).toBe('search')
    expect(categorizeServer('Vector search capabilities')).toBe('search')
    expect(categorizeServer('Elasticsearch integration')).toBe('search')
    expect(categorizeServer('Semantic search tool')).toBe('search')
  })

  it('categorizes code servers', () => {
    expect(categorizeServer('GitHub repository manager')).toBe('code')
    expect(categorizeServer('Git integration tool')).toBe('code')
    expect(categorizeServer('Code syntax analyzer')).toBe('code')
    expect(categorizeServer('Pull request manager')).toBe('code')
  })

  it('categorizes web servers', () => {
    expect(categorizeServer('HTTP API client')).toBe('web')
    expect(categorizeServer('REST endpoint handler')).toBe('web')
    expect(categorizeServer('Web scraper tool')).toBe('web')
    expect(categorizeServer('Browser automation')).toBe('web')
  })

  it('categorizes AI servers', () => {
    expect(categorizeServer('AI model integration')).toBe('ai')
    expect(categorizeServer('LLM connector')).toBe('ai')
    expect(categorizeServer('Machine learning tool')).toBe('ai')
    expect(categorizeServer('NLP processor')).toBe('ai')
  })

  it('categorizes data servers', () => {
    expect(categorizeServer('Data analytics tool')).toBe('data')
    expect(categorizeServer('ETL pipeline')).toBe('data')
    expect(categorizeServer('CSV processor')).toBe('data')
  })

  it('categorizes tools servers', () => {
    expect(categorizeServer('Utility tool for automation')).toBe('tools')
    expect(categorizeServer('CLI helper')).toBe('tools')
    expect(categorizeServer('Task scheduler')).toBe('tools')
    expect(categorizeServer('Workflow automation')).toBe('tools')
  })

  it('returns "other" for unmatched descriptions', () => {
    expect(categorizeServer('Random server')).toBe('other')
    expect(categorizeServer('Custom integration')).toBe('other')
  })

  it('returns "other" for null description', () => {
    expect(categorizeServer(null)).toBe('other')
  })

  it('returns "other" for empty description', () => {
    expect(categorizeServer('')).toBe('other')
  })

  it('is case-insensitive', () => {
    expect(categorizeServer('DATABASE SERVER')).toBe('database')
    expect(categorizeServer('Search Engine')).toBe('search')
  })

  it('matches keywords within words', () => {
    expect(categorizeServer('PostgreSQL database')).toBe('database')
    expect(categorizeServer('Elasticsearch integration')).toBe('search')
  })

  it('uses first-match-wins priority', () => {
    // Database comes before search in the category list
    expect(categorizeServer('Database search tool')).toBe('database')
    // Code comes before web
    expect(categorizeServer('Code web scraper')).toBe('code')
  })

  it('handles multiple keywords correctly', () => {
    expect(categorizeServer('PostgreSQL database with SQL queries')).toBe('database')
    expect(categorizeServer('GitHub code repository manager')).toBe('code')
  })

  it('handles descriptions with special characters', () => {
    expect(categorizeServer('PostgreSQL-database-server (v2.0)')).toBe('database')
  })
})

describe('getCategoryDisplayName', () => {
  it('returns correct display name for all categories', () => {
    expect(getCategoryDisplayName('database')).toBe('Database')
    expect(getCategoryDisplayName('search')).toBe('Search')
    expect(getCategoryDisplayName('code')).toBe('Code')
    expect(getCategoryDisplayName('web')).toBe('Web')
    expect(getCategoryDisplayName('ai')).toBe('AI')
    expect(getCategoryDisplayName('data')).toBe('Data')
    expect(getCategoryDisplayName('tools')).toBe('Tools')
    expect(getCategoryDisplayName('other')).toBe('Other')
  })
})

describe('getCategories', () => {
  it('returns all categories including other', () => {
    const categories = getCategories()
    
    expect(categories).toHaveLength(8)
    expect(categories).toContain('database')
    expect(categories).toContain('search')
    expect(categories).toContain('code')
    expect(categories).toContain('web')
    expect(categories).toContain('ai')
    expect(categories).toContain('data')
    expect(categories).toContain('tools')
    expect(categories).toContain('other')
  })

  it('returns categories in correct order', () => {
    const categories = getCategories()
    
    expect(categories[0]).toBe('database')
    expect(categories[7]).toBe('other')
  })
})
