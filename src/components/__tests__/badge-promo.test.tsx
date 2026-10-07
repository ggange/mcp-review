import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BadgePromo } from '../badge-promo'

describe('BadgePromo', () => {
  it('invites maintainers to the badges page with a rendered example badge', () => {
    render(<BadgePromo />)

    expect(screen.getByRole('heading', { name: /Maintain an MCP server\?/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Get your badge' })).toHaveAttribute('href', '/badges')
    expect(screen.getByAltText(/Example MCP Review badge/).getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
  })
})
