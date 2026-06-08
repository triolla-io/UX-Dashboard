import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App state machine', () => {
  it('renders upload screen initially', () => {
    render(<App />)
    expect(screen.getByTestId('upload-screen')).toBeInTheDocument()
  })
})
