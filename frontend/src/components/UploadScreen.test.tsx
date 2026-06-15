import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UploadScreen from './UploadScreen'

describe('UploadScreen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the dropzone', () => {
    render(<UploadScreen onSubmit={vi.fn()} />)
    expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  })

  it('shows error for wrong file type and does not submit', async () => {
    const onSubmit = vi.fn()
    render(<UploadScreen onSubmit={onSubmit} />)
    const file = new File(['gif'], 'image.gif', { type: 'image/gif' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please upload a PNG, JPG, or WEBP image.'
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows error for file over 10MB and does not submit', async () => {
    const onSubmit = vi.fn()
    render(<UploadScreen onSubmit={onSubmit} />)
    const file = new File(['x'], 'image.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'File is too large. Max size is 10MB.'
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('auto-submits on valid PNG file selection', async () => {
    const onSubmit = vi.fn()
    render(<UploadScreen onSubmit={onSubmit} />)
    const file = new File(['image'], 'image.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    const [, mediaType, context] = onSubmit.mock.calls[0]
    expect(mediaType).toBe('image/png')
    expect(context).toBe('')
  })

  it('auto-submits on valid WEBP file selection', async () => {
    const onSubmit = vi.fn()
    render(<UploadScreen onSubmit={onSubmit} />)
    const file = new File(['image'], 'image.webp', { type: 'image/webp' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
  })

  it('calls onSubmit with correct base64 and mediaType', async () => {
    const onSubmit = vi.fn()
    render(<UploadScreen onSubmit={onSubmit} />)
    const file = new File(['hello'], 'image.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    const [base64, mediaType] = onSubmit.mock.calls[0]
    expect(mediaType).toBe('image/png')
    expect(typeof base64).toBe('string')
    expect(base64.length).toBeGreaterThan(0)
  })
})

describe('usage limit modal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows blocked modal when serverBlocked prop is true', async () => {
    render(<UploadScreen onSubmit={vi.fn()} serverBlocked={true} />)
    await vi.waitFor(() => screen.getByTestId('blocked-modal'))
    expect(screen.getByTestId('blocked-modal')).toBeInTheDocument()
  })

  it('closes blocked modal when X is clicked', async () => {
    render(<UploadScreen onSubmit={vi.fn()} serverBlocked={true} />)
    await vi.waitFor(() => screen.getByTestId('blocked-modal'))
    await userEvent.click(screen.getByTestId('blocked-modal-close'))
    expect(screen.queryByTestId('blocked-modal')).not.toBeInTheDocument()
  })

  it('closes blocked modal when backdrop is clicked', async () => {
    render(<UploadScreen onSubmit={vi.fn()} serverBlocked={true} />)
    await vi.waitFor(() => screen.getByTestId('blocked-modal'))
    await userEvent.click(screen.getByTestId('blocked-modal'))
    expect(screen.queryByTestId('blocked-modal')).not.toBeInTheDocument()
  })
})
