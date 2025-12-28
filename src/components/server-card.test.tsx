import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ServerCard } from './server-card'

const mockServer = {
  id: 'ai.exa/exa',
  name: 'exa',
  organization: 'ai.exa',
  description: 'Fast, intelligent web search',
  version: '3.0.0',
  repositoryUrl: 'https://github.com/exa-labs/exa-mcp-server',
  packages: null,
  remotes: null,
  avgTrustworthiness: 4.5,
  avgUsefulness: 4.2,
  totalRatings: 10,
  isOfficial: true,
  syncedAt: new Date(),
}

describe('ServerCard', () => {
  it('renders server name', () => {
    render(<ServerCard server={mockServer} />)
    expect(screen.getByText('exa')).toBeInTheDocument()
  })

  it('renders organization', () => {
    render(<ServerCard server={mockServer} />)
    expect(screen.getByText('by ai.exa')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<ServerCard server={mockServer} />)
    expect(screen.getByText('Fast, intelligent web search')).toBeInTheDocument()
  })

  it('renders official badge when isOfficial is true', () => {
    render(<ServerCard server={mockServer} />)
    expect(screen.getByText('Official')).toBeInTheDocument()
  })

  it('renders version badge', () => {
    render(<ServerCard server={mockServer} />)
    expect(screen.getByText('v3.0.0')).toBeInTheDocument()
  })

  it('shows "No description available" when description is null', () => {
    const serverWithoutDesc = { ...mockServer, description: null }
    render(<ServerCard server={serverWithoutDesc} />)
    expect(screen.getByText('No description available')).toBeInTheDocument()
  })

  it('links to server detail page', () => {
    render(<ServerCard server={mockServer} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/servers/ai.exa%2Fexa')
  })
})

