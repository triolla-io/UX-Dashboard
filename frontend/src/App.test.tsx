import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders upload screen initially', () => {
    render(<App />)
    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })

  it('shows loading screen after submit, then result on success', async () => {
    let resolveFetch!: (v: any) => void
    const pending = new Promise((r) => { resolveFetch = r })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending))

    render(<App />)

    const file = new File(['img'], 'shot.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await userEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    resolveFetch({ ok: true, text: async () => JSON.stringify({ feedback: 'Looking good!' }) })

    await waitFor(() => {
      expect(screen.getByTestId('feedback-text')).toHaveTextContent('Looking good!')
    })
  })

  it('shows error in result screen when API returns error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ error: 'Something went wrong. Please try again later.' }),
    }))

    render(<App />)

    const file = new File(['img'], 'shot.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await userEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again later.'
      )
    })
  })

  it('returns to upload screen when Start Over is clicked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ feedback: 'Good work!' }),
    }))

    render(<App />)

    const file = new File(['img'], 'shot.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await userEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByTestId('reset-button')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('reset-button'))

    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })
})
