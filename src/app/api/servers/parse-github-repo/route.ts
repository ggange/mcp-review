import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { categorizeServer } from '@/lib/server-categories'
import { validateOrigin, csrfErrorResponse } from '@/lib/csrf'
import {
  extractToolsFromMarkdownFile,
  extractToolsFromReadme,
  extractDescription,
  extractUsageTips,
  extractVersionFromReadme,
  validateGitHubUrl,
} from '@/lib/github-parsing'
import type { GitHubRepoParseResult } from '@/types'

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
  const versionFromReadme = extractVersionFromReadme(readme)
  if (versionFromReadme) {
    return versionFromReadme
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
    const urlValidation = validateGitHubUrl(repositoryUrl)
    
    if (!urlValidation.valid || !urlValidation.owner || !urlValidation.repo) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Invalid GitHub repository URL. Must be in format: https://github.com/owner/repo' } },
        { status: 400 }
      )
    }
    
    const { owner, repo: cleanRepo } = urlValidation
    
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
    
    // Try to fetch a dedicated tools markdown file
    // Check common locations: TOOLS.md, docs/TOOLS.md, example_TOOLS.md, docs/example_TOOLS.md
    let toolsMarkdownContent = ''
    const toolsFilePaths = [
      'TOOLS.md',
      'docs/TOOLS.md',
      'example_TOOLS.md',
      'docs/example_TOOLS.md',
    ]
    
    for (const filePath of toolsFilePaths) {
      try {
        const toolsResponse = await fetch(
          `https://api.github.com/repos/${owner}/${cleanRepo}/contents/${filePath}`,
          { headers }
        )
        
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json()
          toolsMarkdownContent = Buffer.from(toolsData.content, 'base64').toString('utf-8')
          break // Found a tools file, stop searching
        }
      } catch {
        // Continue to next file path
      }
    }
    
    // Extract tools - prioritize tools markdown file, fallback to README
    let tools: Array<{ name: string; description: string }> = []
    if (toolsMarkdownContent) {
      tools = extractToolsFromMarkdownFile(toolsMarkdownContent)
    }
    
    // If no tools found in dedicated file, try README
    if (tools.length === 0) {
      tools = extractToolsFromReadme(readmeContent)
    }
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
