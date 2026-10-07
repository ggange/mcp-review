import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import BadgesPage from '../page'
import { ServerBadgeResults } from '@/components/server/server-badge-results'
import { queryServers } from '@/lib/server-queries'

vi.mock('@/lib/server-queries', () => ({
  queryServers: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => null),
}))

vi.mock('@/components/json-ld-script', () => ({
  JsonLdScript: () => null,
}))

async function renderPage(q?: string) {
  render(await BadgesPage({ searchParams: Promise.resolve({ q }) }))
}

async function renderResults(query: string) {
  render(await ServerBadgeResults({ query, baseUrl: 'https://mcpreview.dev' }))
}

describe('/badges page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the search and examples without querying when there is no search', async () => {
    await renderPage()

    expect(screen.getByRole('searchbox', { name: /Server name or organization/ })).toBeInTheDocument()
    expect(screen.getAllByAltText(/^Badge example:/)).toHaveLength(4)
    expect(queryServers).not.toHaveBeenCalled()
  })

  it('links matching servers to the badge card on their page', async () => {
    vi.mocked(queryServers).mockResolvedValue({
      servers: [{ id: 'my-org/my-server', name: 'my-server', organization: 'my-org' }],
    } as never)

    await renderResults('my-server')

    expect(queryServers).toHaveBeenCalledWith(expect.objectContaining({ search: 'my-server' }))
    expect(screen.getByRole('link', { name: /my-server/ })).toHaveAttribute('href', '/servers/my-org%2Fmy-server#readme-badge')
    expect(screen.getByAltText('MCP Review badge for my-server')).toHaveAttribute('src', '/api/badge/my-org/my-server')
  })

  it('offers to submit the server when nothing matches', async () => {
    vi.mocked(queryServers).mockResolvedValue({ servers: [] } as never)

    await renderResults('missing')

    expect(screen.getByText(/No servers match/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Submit your server' })).toHaveAttribute(
      'href',
      '/auth/signin?callbackUrl=' + encodeURIComponent('/dashboard?upload=true')
    )
  })
})
