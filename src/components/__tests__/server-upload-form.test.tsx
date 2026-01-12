import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ServerUploadForm } from '../server/server-upload-form'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

// Mock fetch
global.fetch = vi.fn()

describe('ServerUploadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful GitHub user fetch
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        username: 'testuser',
        avatar: 'https://example.com/avatar.png',
        name: 'Test User',
      }),
    })
  })

  it('renders required form fields', async () => {
    render(<ServerUploadForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/server name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })
  })

  it('renders optional fields', async () => {
    render(<ServerUploadForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/organization/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/repository url/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/usage tips/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/icon/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/version/i)).toBeInTheDocument()
    })
  })

  it('renders tools section', async () => {
    render(<ServerUploadForm />)
    
    await waitFor(() => {
      // Look for the tool name input field to verify tools section is rendered
      expect(screen.getByPlaceholderText(/tool name/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/tool description/i)).toBeInTheDocument()
    })
  })

  it('allows adding tools', async () => {
    render(<ServerUploadForm />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add tool/i })).toBeInTheDocument()
    })
    
    const addToolButton = screen.getByRole('button', { name: /add tool/i })
    fireEvent.click(addToolButton)
    
    const toolInputs = screen.getAllByPlaceholderText(/tool name/i)
    expect(toolInputs.length).toBeGreaterThan(1)
  })

  it('allows removing tools when more than one exists', async () => {
    render(<ServerUploadForm />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add tool/i })).toBeInTheDocument()
    })
    
    // Add a tool first
    const addToolButton = screen.getByRole('button', { name: /add tool/i })
    fireEvent.click(addToolButton)
    
    // Now we should have remove buttons
    const removeButtons = screen.getAllByRole('button', { name: /×/i })
    expect(removeButtons.length).toBeGreaterThan(0)
    
    fireEvent.click(removeButtons[0])
    
    // Should have one less tool input
    const toolInputs = screen.getAllByPlaceholderText(/tool name/i)
    expect(toolInputs.length).toBe(1)
  })

  it('validates icon file size', async () => {
    render(<ServerUploadForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/icon/i)).toBeInTheDocument()
    })
    
    const iconInput = screen.getByLabelText(/icon/i)
    
    // Create a file larger than 2MB
    const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.png', { type: 'image/png' })
    fireEvent.change(iconInput, { target: { files: [largeFile] } })
    
    await waitFor(() => {
      expect(screen.getByText(/file size must be less than 2 mb/i)).toBeInTheDocument()
    })
  })

  it('validates icon file type', async () => {
    render(<ServerUploadForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/icon/i)).toBeInTheDocument()
    })
    
    const iconInput = screen.getByLabelText(/icon/i)
    
    // Create an invalid file type
    const invalidFile = new File(['content'], 'document.pdf', { type: 'application/pdf' })
    fireEvent.change(iconInput, { target: { files: [invalidFile] } })
    
    await waitFor(() => {
      expect(screen.getByText(/file must be png or jpg/i)).toBeInTheDocument()
    })
  })

  it('disables GitHub import button when repository URL is empty', async () => {
    render(<ServerUploadForm />)
    
    await waitFor(() => {
      const importButton = screen.getByRole('button', { name: /import from github/i })
      expect(importButton).toBeDisabled()
    })
  })

  it('enables GitHub import button when repository URL is provided', async () => {
    render(<ServerUploadForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/repository url/i)).toBeInTheDocument()
    })
    
    const repoInput = screen.getByLabelText(/repository url/i)
    fireEvent.change(repoInput, { target: { value: 'https://github.com/owner/repo' } })
    
    const importButton = screen.getByRole('button', { name: /import from github/i })
    expect(importButton).not.toBeDisabled()
  })

  it('validates GitHub URL format before importing', async () => {
    render(<ServerUploadForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/repository url/i)).toBeInTheDocument()
    })
    
    const repoInput = screen.getByLabelText(/repository url/i)
    fireEvent.change(repoInput, { target: { value: 'not-a-github-url' } })
    
    const importButton = screen.getByRole('button', { name: /import from github/i })
    fireEvent.click(importButton)
    
    await waitFor(() => {
      expect(screen.getByText(/valid github repository url/i)).toBeInTheDocument()
    })
  })

  it('handles successful GitHub import', async () => {
    vi.clearAllMocks()
    // Mock fetch to return different responses for different calls
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/user/github') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            username: 'testuser',
            avatar: 'https://example.com/avatar.png',
            name: 'Test User',
          }),
        })
      }
      if (url === '/api/servers/parse-github-repo') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            name: 'test-repo',
            organization: null,
            description: 'Test repository description',
            tools: [
              { name: 'tool1', description: 'Tool 1 description' },
              { name: 'tool2', description: 'Tool 2 description' },
            ],
            usageTips: 'Usage tips here',
            version: '1.0.0',
            repositoryUrl: 'https://github.com/owner/test-repo',
            category: 'other',
          }),
        })
      }
      return Promise.resolve({ ok: false })
    })
    
    render(<ServerUploadForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/repository url/i)).toBeInTheDocument()
    })
    
    const repoInput = screen.getByLabelText(/repository url/i)
    fireEvent.change(repoInput, { target: { value: 'https://github.com/owner/repo' } })
    
    const importButton = screen.getByRole('button', { name: /import from github/i })
    fireEvent.click(importButton)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('test-repo')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test repository description')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('handles GitHub import error', async () => {
    vi.clearAllMocks()
    // Mock fetch to return different responses for different calls
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/user/github') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            username: 'testuser',
            avatar: 'https://example.com/avatar.png',
            name: 'Test User',
          }),
        })
      }
      if (url === '/api/servers/parse-github-repo') {
        return Promise.resolve({
          ok: false,
          json: async () => ({
            error: { code: 'NOT_FOUND', message: 'Repository not found' },
          }),
        })
      }
      return Promise.resolve({ ok: false })
    })
    
    render(<ServerUploadForm />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/repository url/i)).toBeInTheDocument()
    })
    
    const repoInput = screen.getByLabelText(/repository url/i)
    fireEvent.change(repoInput, { target: { value: 'https://github.com/owner/repo' } })
    
    const importButton = screen.getByRole('button', { name: /import from github/i })
    fireEvent.click(importButton)
    
    await waitFor(() => {
      expect(screen.getByText(/repository not found/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('displays GitHub user info when available', async () => {
    render(<ServerUploadForm />)
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('@testuser')).toBeInTheDocument()
    })
  })

  it('displays message when GitHub account is not linked', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockReset()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
    })
    
    render(<ServerUploadForm />)
    
    await waitFor(() => {
      expect(screen.getByText(/github account not linked/i)).toBeInTheDocument()
    })
  })

  it('renders in edit mode when mode prop is set', async () => {
    const initialData = {
      name: 'existing-server',
      organization: 'org',
      description: 'Existing description',
      tools: [{ name: 'tool1', description: 'Tool 1' }],
      usageTips: 'Tips',
      version: '1.0.0',
      repositoryUrl: 'https://github.com/org/repo',
      iconUrl: 'https://example.com/icon.png',
      category: 'database',
    }
    
    render(<ServerUploadForm mode="edit" serverId="org/existing-server" initialData={initialData} />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('existing-server')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /update server/i })).toBeInTheDocument()
    })
  })

  it('populates form fields with initial data', async () => {
    const initialData = {
      name: 'test-server',
      organization: 'test-org',
      description: 'Test description',
      tools: [
        { name: 'tool1', description: 'Tool 1 description' },
        { name: 'tool2', description: 'Tool 2 description' },
      ],
      usageTips: 'Test tips',
      version: '1.0.0',
      repositoryUrl: 'https://github.com/test/repo',
      iconUrl: '',
      category: 'web',
    }
    
    render(<ServerUploadForm initialData={initialData} />)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('test-server')).toBeInTheDocument()
      expect(screen.getByDisplayValue('test-org')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test tips')).toBeInTheDocument()
      expect(screen.getByDisplayValue('1.0.0')).toBeInTheDocument()
    })
  })
})
