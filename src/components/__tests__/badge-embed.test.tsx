import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BadgeEmbed } from '../server/badge-embed'

function markdownSnippet() {
  return screen.getByText((_, el) => el?.tagName === 'CODE' && el.textContent!.startsWith('[![MCP Review]'))
}

describe('BadgeEmbed', () => {
  it('renders the default snippet without a text parameter', () => {
    render(<BadgeEmbed serverId="my-org/my-server" baseUrl="https://mcpreview.dev" />)

    expect(markdownSnippet().textContent).toBe(
      '[![MCP Review](https://mcpreview.dev/api/badge/my-org/my-server)](https://mcpreview.dev/servers/my-org%2Fmy-server)'
    )
  })

  it('applies the suggested review invitation to the snippet and previews it', () => {
    render(<BadgeEmbed serverId="my-server" baseUrl="https://mcpreview.dev" />)

    fireEvent.click(screen.getByRole('button', { name: /Review us on mcpreview\.dev/ }))

    expect(screen.getByLabelText(/Message until the first review/)).toHaveValue('Review us on mcpreview.dev')
    expect(markdownSnippet().textContent).toContain('/api/badge/my-server?text=Review%20us%20on%20mcpreview.dev')
    expect(screen.getByAltText('Badge before the first review: Review us on mcpreview.dev')).toBeInTheDocument()
    // Suggestion disappears once applied
    expect(screen.queryByRole('button', { name: /Use .Review us/ })).not.toBeInTheDocument()
  })

  it('keeps the live preview free of the text parameter', () => {
    render(<BadgeEmbed serverId="my-server" baseUrl="https://mcpreview.dev" />)

    fireEvent.change(screen.getByLabelText(/Message until the first review/), { target: { value: 'Rate us' } })

    expect(screen.getByAltText('MCP Review badge preview')).toHaveAttribute('src', '/api/badge/my-server')
  })
})
