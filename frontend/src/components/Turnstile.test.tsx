import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import Turnstile from './Turnstile'

describe('Turnstile', () => {
  it('renders nothing and never calls onToken when no site key is configured', () => {
    // VITE_TURNSTILE_SITE_KEY is unset in the test env, matching local/dev.
    const onToken = vi.fn()
    const { container } = render(<Turnstile onToken={onToken} />)
    expect(container.firstChild).toBeNull()
    expect(onToken).not.toHaveBeenCalled()
  })
})
