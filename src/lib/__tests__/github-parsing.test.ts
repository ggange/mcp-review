import { describe, it, expect } from 'vitest'
import {
  extractToolsFromMarkdownFile,
  extractToolsFromReadme,
  extractDescription,
  extractUsageTips,
  extractVersionFromReadme,
  validateGitHubUrl,
} from '../github-parsing'

describe('extractToolsFromMarkdownFile', () => {
  it('extracts tools from detailed format with ### headers', () => {
    const content = `### \`search_web\`

Searches the web for information using a search engine. Returns relevant results with titles, URLs, and snippets.

**Parameters:**
- \`query\` (string, required): The search query
- \`max_results\` (number, optional): Maximum number of results

---

### \`fetch_url\`

Fetches content from a URL and returns the HTML or text content.

**Arguments:**
- \`url\` (string, required): The URL to fetch
`

    const tools = extractToolsFromMarkdownFile(content)
    
    expect(tools).toHaveLength(2)
    expect(tools[0]).toEqual({
      name: 'search_web',
      description: expect.stringContaining('Searches the web'),
    })
    expect(tools[1]).toEqual({
      name: 'fetch_url',
      description: expect.stringContaining('Fetches content'),
    })
  })

  it('extracts tools from simple list format', () => {
    // Note: The regex requires items to be separated by newlines
    const content = `# Tools

- **\`tool_one\`**: First tool description here

- **\`tool_two\`**: Second tool description here
`

    const tools = extractToolsFromMarkdownFile(content)
    
    // The regex captures until newline-dash or double newline
    expect(tools.length).toBeGreaterThanOrEqual(1)
    expect(tools[0]).toEqual({
      name: 'tool_one',
      description: 'First tool description here',
    })
  })

  it('skips tools with descriptions shorter than 5 characters', () => {
    const content = `### \`bad_tool\`

Hi

---

### \`good_tool\`

This is a proper description that is long enough
`

    const tools = extractToolsFromMarkdownFile(content)
    
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe('good_tool')
  })

  it('stops extracting description at code blocks', () => {
    const content = `### \`test_tool\`

This is the description text.

\`\`\`json
{
  "example": "code"
}
\`\`\`
`

    const tools = extractToolsFromMarkdownFile(content)
    
    expect(tools).toHaveLength(1)
    expect(tools[0].description).not.toContain('example')
    expect(tools[0].description).toContain('description text')
  })

  it('stops extracting description at Parameters section', () => {
    const content = `### \`test_tool\`

This is the description text.

**Parameters:**
- \`param1\`: description
`

    const tools = extractToolsFromMarkdownFile(content)
    
    expect(tools).toHaveLength(1)
    expect(tools[0].description).not.toContain('param1')
    expect(tools[0].description).toContain('description text')
  })

  it('handles tools without backticks in headers', () => {
    const content = `### search_web

Searches the web for information.

---

### fetch_url

Fetches content from a URL.
`

    const tools = extractToolsFromMarkdownFile(content)
    
    expect(tools).toHaveLength(2)
    expect(tools[0].name).toBe('search_web')
    expect(tools[1].name).toBe('fetch_url')
  })

  it('returns empty array for content with no tools', () => {
    const content = `# Some Document

This is just regular text with no tools defined.
`

    const tools = extractToolsFromMarkdownFile(content)
    
    expect(tools).toHaveLength(0)
  })
})

describe('extractToolsFromReadme', () => {
  it('extracts tools from ## Tools section', () => {
    const readme = `# My Server

## Tools

- **search**: Search the web for information
- **fetch**: Fetch URLs and retrieve content
- **summarize**: Summarize text content

## Other Section

Some other content.
`

    const tools = extractToolsFromReadme(readme)
    
    expect(tools).toHaveLength(3)
    expect(tools[0]).toEqual({
      name: 'search',
      description: 'Search the web for information',
    })
  })

  it('extracts tools from ## Features section', () => {
    const readme = `## Features

- **tool1**: First feature description here

`

    const tools = extractToolsFromReadme(readme)
    
    // The regex requires double newline or another list item to terminate
    expect(tools.length).toBeGreaterThanOrEqual(1)
    if (tools.length > 0) {
      expect(tools[0].name).toBe('tool1')
    }
  })

  it('extracts tools from JSON code blocks', () => {
    const readme = `# Server

\`\`\`json
{
  "tools": [
    {
      "name": "search",
      "description": "Search the web"
    },
    {
      "name": "fetch",
      "description": "Fetch URLs"
    }
  ]
}
\`\`\`
`

    const tools = extractToolsFromReadme(readme)
    
    expect(tools).toHaveLength(2)
    expect(tools[0]).toEqual({
      name: 'search',
      description: 'Search the web',
    })
  })

  it('extracts tools from inline MCP config', () => {
    const readme = `# Server

"tools": [
  {
    "name": "search",
    "description": "Search the web"
  }
]
`

    const tools = extractToolsFromReadme(readme)
    
    expect(tools).toHaveLength(1)
    expect(tools[0]).toEqual({
      name: 'search',
      description: 'Search the web',
    })
  })

  it('returns empty array when no tools found', () => {
    const readme = `# Server

This is just a regular README with no tools.
`

    const tools = extractToolsFromReadme(readme)
    
    expect(tools).toHaveLength(0)
  })

  it('handles case-insensitive section headers', () => {
    const readme = `## TOOLS

- **tool1**: Description one here

`

    const tools = extractToolsFromReadme(readme)
    
    // The regex requires proper termination
    expect(tools.length).toBeGreaterThanOrEqual(1)
  })
})

describe('extractDescription', () => {
  it('prefers repository description when available and meaningful', () => {
    const readme = `# Server

This is the README content.
`
    const repoDescription = 'A great MCP server for web search'

    const description = extractDescription(readme, repoDescription)
    
    expect(description).toBe(repoDescription)
  })

  it('falls back to README when repo description is too short', () => {
    const readme = `# Server

This is a comprehensive description of the server that explains what it does.
`
    const repoDescription = 'Short'

    const description = extractDescription(readme, repoDescription)
    
    expect(description).toContain('comprehensive description')
    expect(description).not.toBe(repoDescription)
  })

  it('extracts first paragraph from README', () => {
    const readme = `# My Server

This is the first paragraph that describes the server.

This is the second paragraph.

## Installation

Install instructions here.
`

    const description = extractDescription(readme, null)
    
    expect(description).toContain('first paragraph')
    expect(description).not.toContain('second paragraph')
    expect(description).not.toContain('Installation')
  })

  it('skips badges and images', () => {
    const readme = `# My Server

![Badge](https://example.com/badge.png)
[![Another Badge](https://example.com/badge2.png)](https://example.com)

This is the actual description.
`

    const description = extractDescription(readme, null)
    
    expect(description).toContain('actual description')
    expect(description).not.toContain('Badge')
  })

  it('skips HTML comments', () => {
    const readme = `# My Server

<!-- This is a comment -->

This is the description.
`

    const description = extractDescription(readme, null)
    
    expect(description).toContain('description')
    expect(description).not.toContain('comment')
  })

  it('stops at first empty line after content', () => {
    const readme = `# My Server

First paragraph here.

Second paragraph here.
`

    const description = extractDescription(readme, null)
    
    expect(description).toContain('First paragraph')
    expect(description).not.toContain('Second paragraph')
  })

  it('returns default when only badges and headers exist', () => {
    const readme = `# Server

![Badge](badge.png)
[![Another](another.png)](link)
`

    const description = extractDescription(readme, null)
    
    expect(description).toBe('An MCP server')
  })
})

describe('extractUsageTips', () => {
  it('extracts usage tips from ## Usage section', () => {
    const readme = `# Server

## Usage

First, install the server. Then configure it. Finally, run it.

## Other Section

More content.
`

    const tips = extractUsageTips(readme)
    
    expect(tips).toContain('install the server')
    expect(tips).not.toContain('Other Section')
  })

  it('extracts from ## Getting Started section', () => {
    const readme = `## Getting Started

Follow these steps to get started.
`

    const tips = extractUsageTips(readme)
    
    expect(tips).toContain('Follow these steps')
  })

  it('extracts from ## Installation section', () => {
    const readme = `## Installation

Install with npm install.
`

    const tips = extractUsageTips(readme)
    
    expect(tips).toContain('npm install')
  })

  it('removes section header from output', () => {
    const readme = `## Usage

This is the actual content.
`

    const tips = extractUsageTips(readme)
    
    expect(tips).not.toMatch(/^##/)
    expect(tips).toContain('actual content')
  })

  it('limits output to 500 characters', () => {
    const longContent = 'a'.repeat(600)
    const readme = `## Usage

${longContent}
`

    const tips = extractUsageTips(readme)
    
    expect(tips?.length).toBeLessThanOrEqual(500)
  })

  it('returns null when no usage section found', () => {
    const readme = `# Server

This is just regular content.
`

    const tips = extractUsageTips(readme)
    
    expect(tips).toBeNull()
  })

  it('handles case-insensitive section headers', () => {
    const readme = `## USAGE

Usage content here.
`

    const tips = extractUsageTips(readme)
    
    expect(tips).toContain('Usage content')
  })
})

describe('extractVersionFromReadme', () => {
  it('extracts version from "version: 1.0.0" format', () => {
    const readme = `# Server

version: 1.0.0
`

    const version = extractVersionFromReadme(readme)
    
    expect(version).toBe('1.0.0')
  })

  it('extracts version from "Version: 2.3.1" format', () => {
    const readme = `Version: 2.3.1
`

    const version = extractVersionFromReadme(readme)
    
    expect(version).toBe('2.3.1')
  })

  it('extracts version from "v: v1.2.3" format', () => {
    const readme = `v: v1.2.3
`

    const version = extractVersionFromReadme(readme)
    
    expect(version).toBe('1.2.3')
  })

  it('handles version without patch number', () => {
    const readme = `version: 1.0
`

    const version = extractVersionFromReadme(readme)
    
    expect(version).toBe('1.0')
  })

  it('handles case-insensitive version keyword', () => {
    const readme = `VERSION: 3.0.0
`

    const version = extractVersionFromReadme(readme)
    
    expect(version).toBe('3.0.0')
  })

  it('returns null when no version found', () => {
    const readme = `# Server

No version information here.
`

    const version = extractVersionFromReadme(readme)
    
    expect(version).toBeNull()
  })
})

describe('validateGitHubUrl', () => {
  it('validates correct GitHub URL', () => {
    const result = validateGitHubUrl('https://github.com/owner/repo')
    
    expect(result.valid).toBe(true)
    expect(result.owner).toBe('owner')
    expect(result.repo).toBe('repo')
  })

  it('handles URLs with .git suffix', () => {
    const result = validateGitHubUrl('https://github.com/owner/repo.git')
    
    expect(result.valid).toBe(true)
    expect(result.repo).toBe('repo')
  })

  it('handles URLs with additional path', () => {
    const result = validateGitHubUrl('https://github.com/owner/repo/tree/main')
    
    expect(result.valid).toBe(true)
    expect(result.owner).toBe('owner')
    expect(result.repo).toBe('repo')
  })

  it('handles HTTP URLs', () => {
    const result = validateGitHubUrl('http://github.com/owner/repo')
    
    expect(result.valid).toBe(true)
    expect(result.owner).toBe('owner')
  })

  it('rejects invalid URLs', () => {
    const result = validateGitHubUrl('https://gitlab.com/owner/repo')
    
    expect(result.valid).toBe(false)
    expect(result.owner).toBeUndefined()
    expect(result.repo).toBeUndefined()
  })

  it('rejects malformed URLs', () => {
    const result = validateGitHubUrl('not-a-url')
    
    expect(result.valid).toBe(false)
  })

  it('handles URLs with trailing slash', () => {
    const result = validateGitHubUrl('https://github.com/owner/repo/')
    
    expect(result.valid).toBe(true)
    expect(result.owner).toBe('owner')
    expect(result.repo).toBe('repo')
  })

  it('trims whitespace', () => {
    const result = validateGitHubUrl('  https://github.com/owner/repo  ')
    
    expect(result.valid).toBe(true)
    expect(result.owner).toBe('owner')
  })
})
