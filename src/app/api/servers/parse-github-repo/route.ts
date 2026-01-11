import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { categorizeServer } from '@/lib/server-categories'
import { validateOrigin, csrfErrorResponse } from '@/lib/csrf'
import type { GitHubRepoParseResult } from '@/types'

/**
 * Extract tools from README content using multiple strategies
 */
function extractToolsFromReadme(readme: string): Array<{ name: string; description: string }> {
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
function extractDescription(readme: string, repoDescription: string | null): string {
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
function extractUsageTips(readme: string): string | null {
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
 * Extract version from README or package.json
 */
async function extractVersion(
  readme: string, 
  owner: string, 
  repo: string, 
  githubToken: string | null
): Promise<string | null> {
  // Strategy 1: Try to find version in README
  const versionRegex = /(?:version|v)\s*[:=]\s*v?([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i
  const match = readme.match(versionRegex)
  if (match) {
    return match[1]
  }
  
  // Strategy 2: Try to fetch package.json
  if (githubToken) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
        {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        const content = Buffer.from(data.content, 'base64').toString('utf-8')
        const packageJson = JSON.parse(content)
        if (packageJson.version) {
          return packageJson.version
        }
      }
    } catch {
      // Ignore errors - version is optional
    }
  }
  
  return null
}

export async function POST(request: Request) {
  try {
    // CSRF protection
    const originCheck = validateOrigin(request)
    if (!originCheck.isValid) {
      return NextResponse.json(csrfErrorResponse(), { status: 403 })
    }

    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to import from GitHub' } },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { repositoryUrl } = body
    
    if (!repositoryUrl || typeof repositoryUrl !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Repository URL is required' } },
        { status: 400 }
      )
    }
    
    // Validate GitHub URL format
    const githubUrlRegex = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/.*)?$/
    const match = repositoryUrl.trim().match(githubUrlRegex)
    
    if (!match) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid GitHub repository URL. Must be in format: https://github.com/owner/repo' } },
        { status: 400 }
      )
    }
    
    const [, owner, repo] = match
    const cleanRepo = repo.replace(/\.git$/, '')
    
    // Get GitHub token if available (reuse from sign-in)
    let githubToken: string | null = null
    try {
      const githubAccount = await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          provider: 'github',
        },
        select: {
          access_token: true,
        },
      })
      githubToken = githubAccount?.access_token || null
    } catch {
      // Continue without token (will use public API with lower rate limits)
    }
    
    // Fetch repository info
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
    }
    if (githubToken) {
      headers.Authorization = `token ${githubToken}`
    }
    
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepo}`,
      { headers }
    )
    
    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Repository not found or not accessible' } },
          { status: 404 }
        )
      }
      if (repoResponse.status === 403) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Repository access denied. It may be private or rate limited.' } },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: { code: 'EXTERNAL_ERROR', message: `GitHub API error: ${repoResponse.statusText}` } },
        { status: repoResponse.status }
      )
    }
    
    const repoData = await repoResponse.json()
    
    // Fetch README
    let readmeContent = ''
    try {
      const readmeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${cleanRepo}/readme`,
        { headers }
      )
      
      if (readmeResponse.ok) {
        const readmeData = await readmeResponse.json()
        readmeContent = Buffer.from(readmeData.content, 'base64').toString('utf-8')
      }
    } catch {
      // README is optional - continue with what we have
    }
    
    // Extract information
    const tools = extractToolsFromReadme(readmeContent)
    const description = extractDescription(readmeContent, repoData.description)
    const usageTips = extractUsageTips(readmeContent)
    const version = await extractVersion(readmeContent, owner, cleanRepo, githubToken)
    
    // Determine organization (use owner if it looks like an organization, otherwise null)
    // For now, we'll set it to null and let user decide
    const organization = null
    
    // Auto-categorize based on description
    const category = categorizeServer(description)
    
    const result: GitHubRepoParseResult = {
      name: cleanRepo,
      organization,
      description,
      tools: tools.length > 0 ? tools : [{ name: '', description: '' }],
      usageTips,
      version,
      repositoryUrl: `https://github.com/${owner}/${cleanRepo}`,
      category,
    }
    
    return NextResponse.json(result)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error parsing GitHub repo:', error)
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to parse repository' } },
      { status: 500 }
    )
  }
}
