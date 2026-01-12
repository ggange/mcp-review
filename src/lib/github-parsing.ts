/**
 * GitHub repository parsing utilities
 * Extracted pure functions for testability
 */

/**
 * Extract tools from a dedicated tools markdown file
 * Supports both detailed format (### tool_name) and simple list format (- **tool_name**: description)
 */
export function extractToolsFromMarkdownFile(content: string): Array<{ name: string; description: string }> {
  const tools: Array<{ name: string; description: string }> = []
  
  // Strategy 1: Detailed format with ### headers
  // Pattern: ### `tool_name` followed by description
  const detailedToolRegex = /###\s+`?([^`\n]+)`?\s*\n([\s\S]*?)(?=###|---|$)/g
  let match
  while ((match = detailedToolRegex.exec(content)) !== null) {
    const name = match[1].trim()
    const description = match[2].trim()
    
    // Extract description from the content (skip parameters, examples, etc.)
    // Take the first paragraph or first few sentences
    const lines = description.split('\n')
    let descText = ''
    for (const line of lines) {
      const trimmed = line.trim()
      // Skip empty lines, code blocks, parameter lists, examples
      if (trimmed && 
          !trimmed.startsWith('**Parameters:**') &&
          !trimmed.startsWith('**Example:**') &&
          !trimmed.startsWith('```') &&
          !trimmed.startsWith('- `') &&
          !trimmed.match(/^[A-Z][a-z]+ \(/)) { // Skip parameter definitions
        descText += trimmed + ' '
        if (descText.length > 200) break
      }
      // Stop at first code block or parameter section
      if (trimmed.startsWith('**Parameters:**') || trimmed.startsWith('```')) {
        break
      }
    }
    
    if (name && descText.trim().length > 5) {
      tools.push({ name, description: descText.trim() })
    }
  }
  
  // Strategy 2: Simple list format (- **tool_name**: description)
  if (tools.length === 0) {
    const listItemRegex = /[-*]\s*\*\*`?([^`*\n]+)`?\*\*[:\-]?\s*(.+?)(?=\n[-*]|\n\n|$)/g
    while ((match = listItemRegex.exec(content)) !== null) {
      const name = match[1].trim()
      const description = match[2].trim()
      if (name && description && description.length > 5) {
        tools.push({ name, description })
      }
    }
  }
  
  return tools
}

/**
 * Extract tools from README content using multiple strategies
 */
export function extractToolsFromReadme(readme: string): Array<{ name: string; description: string }> {
  const tools: Array<{ name: string; description: string }> = []
  
  // Strategy 1: Look for ## Tools or ## Features section
  const toolsSectionRegex = /##\s*(?:Tools|Features|Capabilities|Functions)[\s\S]*?(?=##|$)/i
  const toolsMatch = readme.match(toolsSectionRegex)
  
  if (toolsMatch) {
    const toolsContent = toolsMatch[0]
    // Match list items with tool names and descriptions
    // Pattern: - **tool_name**: description or - **tool_name** - description
    const toolItemRegex = /[-*]\s*\*\*([^*]+)\*\*[:\-]?\s*(.+?)(?=\n[-*]|\n\n|$)/g
    let match
    while ((match = toolItemRegex.exec(toolsContent)) !== null) {
      const name = match[1].trim()
      const description = match[2].trim()
      if (name && description && description.length > 5) {
        tools.push({ name, description })
      }
    }
  }
  
  // Strategy 2: Look for MCP server configuration patterns in code blocks
  const codeBlockRegex = /```(?:json|yaml|toml)?\s*\{[\s\S]*?"tools?"[\s\S]*?\}[\s\S]*?```/i
  const codeMatch = readme.match(codeBlockRegex)
  if (codeMatch) {
    try {
      // Extract JSON from code block
      let jsonStr = codeMatch[0]
      jsonStr = jsonStr.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim()
      
      // Try to find tools array in the JSON
      const toolsMatch = jsonStr.match(/"tools"\s*:\s*\[([\s\S]*?)\]/i)
      if (toolsMatch) {
        const toolsArray = toolsMatch[1]
        const toolRegex = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"description"\s*:\s*"([^"]+)"\s*\}/g
        let match
        while ((match = toolRegex.exec(toolsArray)) !== null) {
          tools.push({ 
            name: match[1].trim(), 
            description: match[2].trim() 
          })
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }
  
  // Strategy 3: Look for inline MCP config patterns
  const mcpConfigRegex = /"tools"\s*:\s*\[([\s\S]*?)\]/i
  const mcpMatch = readme.match(mcpConfigRegex)
  if (mcpMatch && tools.length === 0) {
    const toolsArray = mcpMatch[1]
    const toolRegex = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"description"\s*:\s*"([^"]+)"\s*\}/g
    let match
    while ((match = toolRegex.exec(toolsArray)) !== null) {
      tools.push({ 
        name: match[1].trim(), 
        description: match[2].trim() 
      })
    }
  }
  
  return tools
}

/**
 * Extract description from README or repository description
 */
export function extractDescription(readme: string, repoDescription: string | null): string {
  // Use repo description if available and meaningful
  if (repoDescription && repoDescription.length > 10) {
    return repoDescription
  }
  
  // Extract first paragraph from README
  const lines = readme.split('\n')
  let description = ''
  
  // Skip title and badges
  let startIndex = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('# ')) {
      startIndex = i + 1
      break
    }
  }
  
  // Find first meaningful paragraph
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    // Skip badges, empty lines, and headers
    if (line && 
        !line.startsWith('![') && 
        !line.startsWith('[') && 
        !line.startsWith('#') &&
        !line.startsWith('<!--')) {
      description += line + ' '
      if (description.length > 200) break
    }
    // Stop at first empty line after we have content
    if (description && line === '') break
  }
  
  return description.trim() || 'An MCP server'
}

/**
 * Extract usage tips from README
 */
export function extractUsageTips(readme: string): string | null {
  const usageSectionRegex = /##\s*(?:Usage|Getting Started|Installation|Examples?|Quick Start)[\s\S]*?(?=##|$)/i
  const match = readme.match(usageSectionRegex)
  if (match) {
    const content = match[0]
    // Remove the header and get first 500 chars
    const text = content.replace(/^##\s*[^\n]+\n/i, '').trim()
    return text.substring(0, 500).trim() || null
  }
  return null
}

/**
 * Extract version from README
 * Note: This is a pure function that only extracts from README content
 * The async fetch to package.json is kept in the route handler
 */
export function extractVersionFromReadme(readme: string): string | null {
  const versionRegex = /(?:version|v)\s*[:=]\s*v?([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i
  const match = readme.match(versionRegex)
  if (match) {
    return match[1]
  }
  return null
}

/**
 * Validate GitHub URL format
 */
export function validateGitHubUrl(url: string): { valid: boolean; owner?: string; repo?: string } {
  const githubUrlRegex = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/.*)?$/
  const match = url.trim().match(githubUrlRegex)
  
  if (!match) {
    return { valid: false }
  }
  
  const [, owner, repo] = match
  const cleanRepo = repo.replace(/\.git$/, '')
  
  return { valid: true, owner, repo: cleanRepo }
}
