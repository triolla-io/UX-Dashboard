import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResultScreen from './ResultScreen'

describe('ResultScreen', () => {
  it('displays feedback text', () => {
    render(<ResultScreen feedback="Great layout!" error={null} onReset={vi.fn()} />)
    expect(screen.getByTestId('feedback-text')).toHaveTextContent('Great layout!')
  })

  it('shows download button when no error is present', () => {
    render(<ResultScreen feedback="Great layout!" error={null} onReset={vi.fn()} />)
    expect(screen.getByTestId('download-button')).toBeInTheDocument()
  })

  it('does not show download button when error is present', () => {
    render(<ResultScreen feedback="" error="Something went wrong." onReset={vi.fn()} />)
    expect(screen.queryByTestId('download-button')).not.toBeInTheDocument()
  })

  it('shows error message when error is present', () => {
    render(
      <ResultScreen feedback="" error="Something went wrong. Please try again later." onReset={vi.fn()} />
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again later.'
    )
  })

  it('calls onReset when Start Over is clicked', async () => {
    const onReset = vi.fn()
    render(<ResultScreen feedback="feedback" error={null} onReset={onReset} />)
    await userEvent.click(screen.getByTestId('reset-button'))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('triggers file download with correct filename format when Download TXT is clicked', async () => {
    vi.useFakeTimers()
    const createObjectURL = vi.fn().mockReturnValue('blob:mock')
    const revokeObjectURL = vi.fn()
    const clickFn = vi.fn()

    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const createElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = createElement(tag)
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: clickFn })
      }
      return el
    })

    render(<ResultScreen feedback="My feedback" error={null} onReset={vi.fn()} />)
    fireEvent.click(screen.getByTestId('download-button'))

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clickFn).toHaveBeenCalledOnce()

    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledOnce()

    const anchor = (document.createElement as any).mock.results.find(
      (r: any) => r.value.tagName === 'A'
    )?.value
    expect(anchor?.download).toMatch(/^dashboard-feedback-.+\.txt$/)

    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
})
