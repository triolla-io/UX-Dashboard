import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResultCard from './ResultCard'
import type { AuditResult } from '../types'

const result: AuditResult = {
  overall: 47,
  verdict: 'Below industry average',
  categories: {
    ux: { score: 72, evidence: 'e' },
    visualDesign: { score: 40, evidence: 'e' },
    usability: { score: 55, evidence: 'e' },
    dataClarity: { score: 22, evidence: 'e' },
  },
  insights: [
    { text: 'Visible one A', category: 'ux', sentiment: 'positive', priority: 2 },
    { text: 'Visible one B', category: 'dataClarity', sentiment: 'issue', priority: 1 },
    { text: 'Visible one C', category: 'usability', sentiment: 'issue', priority: 3 },
    { text: 'Visible one D', category: 'visualDesign', sentiment: 'positive', priority: 4 },
    { text: 'Locked one E', category: 'ux', sentiment: 'issue', priority: 5 },
    { text: 'Locked one F', category: 'ux', sentiment: 'issue', priority: 6 },
  ],
}

describe('ResultCard', () => {
  it('renders the verdict and the four category scores from structured data', () => {
    render(<ResultCard result={result} error={null} onReset={vi.fn()} />)
    expect(screen.getByText('Below industry average')).toBeInTheDocument()
    expect(screen.getByText('72')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getByText('55')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
  })

  it('shows the four highest-priority insights and an honest locked count', () => {
    render(<ResultCard result={result} error={null} onReset={vi.fn()} />)
    const visible = screen.getAllByTestId('visible-insight')
    expect(visible).toHaveLength(4)
    expect(visible[0]).toHaveTextContent('Visible one B') // priority 1
    expect(screen.getByText(/insights are locked/)).toHaveTextContent('2+ insights are locked')
  })

  it('shows an error and hides the report + download when error is present', () => {
    render(<ResultCard result={null} error="Something went wrong." onReset={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.')
    expect(screen.queryByTestId('download-button')).not.toBeInTheDocument()
  })

  it('calls onReset when the reset hook is clicked', async () => {
    const onReset = vi.fn()
    render(<ResultCard result={result} error={null} onReset={onReset} />)
    await userEvent.click(screen.getByTestId('reset-button'))
    expect(onReset).toHaveBeenCalledOnce()
  })
})
