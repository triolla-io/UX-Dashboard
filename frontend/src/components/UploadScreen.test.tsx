import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UploadScreen from './UploadScreen'

describe('UploadScreen', () => {
  it('submit button is disabled when no file is selected', () => {
    render(<UploadScreen onSubmit={vi.fn()} />)
    expect(screen.getByTestId('submit-button')).toBeDisabled()
  })

  it('shows error and keeps button disabled for wrong file type', async () => {
    render(<UploadScreen onSubmit={vi.fn()} />)
    const file = new File(['gif'], 'image.gif', { type: 'image/gif' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please upload a PNG, JPG, or WEBP image.'
    )
    expect(screen.getByTestId('submit-button')).toBeDisabled()
  })

  it('shows error and keeps button disabled for file over 10MB', async () => {
    render(<UploadScreen onSubmit={vi.fn()} />)
    const file = new File(['x'], 'image.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'File is too large. Max size is 10MB.'
    )
    expect(screen.getByTestId('submit-button')).toBeDisabled()
  })

  it('enables submit button for valid PNG file', async () => {
    render(<UploadScreen onSubmit={vi.fn()} />)
    const file = new File(['image'], 'image.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByTestId('submit-button')).toBeEnabled()
  })

  it('enables submit button for valid WEBP file', async () => {
    render(<UploadScreen onSubmit={vi.fn()} />)
    const file = new File(['image'], 'image.webp', { type: 'image/webp' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    expect(screen.getByTestId('submit-button')).toBeEnabled()
  })

  it('truncates context input to 200 characters', async () => {
    render(<UploadScreen onSubmit={vi.fn()} />)
    const input = screen.getByTestId('context-input')
    await userEvent.type(input, 'a'.repeat(250))
    expect((input as HTMLTextAreaElement).value).toHaveLength(200)
  })

  it('calls onSubmit with base64, mediaType, and context when submitted', async () => {
    const onSubmit = vi.fn()
    render(<UploadScreen onSubmit={onSubmit} />)

    const file = new File(['hello'], 'image.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await userEvent.type(screen.getByTestId('context-input'), 'fintech SaaS')
    await userEvent.click(screen.getByTestId('submit-button'))

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce()
    })

    const [base64, mediaType, context] = onSubmit.mock.calls[0]
    expect(mediaType).toBe('image/png')
    expect(context).toBe('fintech SaaS')
    expect(typeof base64).toBe('string')
    expect(base64.length).toBeGreaterThan(0)
  })
})
