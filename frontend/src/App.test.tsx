import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App integration', () => {
  const AUDIT = {
    overall: 47,
    verdict: 'Below industry average',
    categories: {
      ux: { score: 72, evidence: 'e' },
      visualDesign: { score: 40, evidence: 'e' },
      usability: { score: 55, evidence: 'e' },
      dataClarity: { score: 22, evidence: 'e' },
    },
    insights: [{ text: 'No freshness timestamp on tiles', category: 'dataClarity', sentiment: 'issue', priority: 1 }],
  }

  beforeEach(() => {
    // Each test gets a fresh free-use count so the usage-limit modal
    // doesn't intercept the submit flow.
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders upload screen initially', () => {
    render(<App />)
    expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  })

  it('shows loading screen after file selection, then result on success', async () => {
    let resolveFetch!: (v: any) => void
    const pending = new Promise((r) => { resolveFetch = r })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending))

    render(<App />)
    const file = new File(['img'], 'shot.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())

    resolveFetch({ ok: true, text: async () => JSON.stringify(AUDIT) })

    await waitFor(() => expect(screen.getByText('Below industry average')).toBeInTheDocument())
  })

  it('shows error in result screen when API returns error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ error: 'Something went wrong. Please try again later.' }),
    }))

    render(<App />)
    const file = new File(['img'], 'shot.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again later.'
      )
    })
  })

  it('returns to upload screen when Start Over is clicked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(AUDIT),
    }))

    render(<App />)
    const file = new File(['img'], 'shot.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(screen.getByTestId('reset-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('reset-button'))
    expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  })
})
