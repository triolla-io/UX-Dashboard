import { useState } from 'react'
import { AuditResult, FeedbackState } from './types'
import UploadScreen from './components/UploadScreen'
import LoadingScreen from './components/LoadingScreen'
import ResultScreen from './components/ResultScreen'

const PREVIEW = import.meta.env.DEV && typeof location !== 'undefined'
  ? new URLSearchParams(location.search).get('preview')
  : null
const MOCK = PREVIEW === 'result'
// Dev-only preview fixture (gated by `import.meta.env.DEV`, tree-shaken out of production
// builds). These are static sample numbers for ?preview=result — NOT real scores. Real scores
// always come from the model via /api/feedback; the app never fabricates or hardcodes them.
const MOCK_RESULT: AuditResult = {
  overall: 47,
  verdict: 'Below industry average',
  categories: {
    ux: { score: 78, evidence: 'clear top nav and tab structure' },
    visualDesign: { score: 24, evidence: 'low-contrast secondary labels' },
    usability: { score: 71, evidence: 'consistent card affordances' },
    dataClarity: { score: 62, evidence: 'no freshness timestamps on any tile' },
  },
  insights: [
    { text: 'No data freshness timestamps on the metric tiles', category: 'dataClarity', sentiment: 'issue', priority: 1 },
    { text: 'Strong visual hierarchy across primary metrics', category: 'visualDesign', sentiment: 'positive', priority: 2 },
    { text: 'KPI grouping is intuitive and scannable', category: 'ux', sentiment: 'positive', priority: 3 },
    { text: 'Consistent card structure improves scanability', category: 'visualDesign', sentiment: 'positive', priority: 4 },
    { text: 'Multi-source totals may disagree with their detail', category: 'dataClarity', sentiment: 'issue', priority: 5 },
    { text: 'Ambiguous unit labels on the conversion funnel', category: 'dataClarity', sentiment: 'issue', priority: 6 },
  ],
}

const initialState: FeedbackState = {
  view: PREVIEW === 'loading' ? 'loading' : MOCK ? 'result' : 'upload',
  result: MOCK ? MOCK_RESULT : null,
  error: null,
}

const USAGE_KEY = 'triolla_usage_count'
const MAX_FREE_USES = 2

function getUsageCount(): number {
  return parseInt(localStorage.getItem(USAGE_KEY) || '0', 10)
}

function incrementUsage(): void {
  localStorage.setItem(USAGE_KEY, String(getUsageCount() + 1))
}

export default function App() {
  const [state, setState] = useState<FeedbackState>(() => {
    if (getUsageCount() >= MAX_FREE_USES) return { view: 'blocked', result: null, error: null }
    return initialState
  })

  const handleSubmit = async (image: string, mediaType: string, context: string) => {
    if (getUsageCount() >= MAX_FREE_USES) {
      setState({ view: 'blocked', result: null, error: null })
      return
    }
    incrementUsage()
    setState({ view: 'loading', result: null, error: null })
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mediaType, context }),
      })

      const raw = await res.text()
      let data: Partial<AuditResult> & { error?: string } = {}
      if (raw) {
        try {
          data = JSON.parse(raw)
        } catch {
          console.error('Non-JSON response from server:', res.status, raw.slice(0, 300))
          throw new Error(
            res.status === 504
              ? 'The analysis took too long. Please try again.'
              : `Analysis failed (${res.status}). Please try again.`
          )
        }
      }

      if (res.status === 429) {
        setState({ view: 'blocked', result: null, error: null })
        return
      }

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again later.')
      }
      if (typeof data.overall !== 'number' || !data.categories) {
        throw new Error('The analysis service did not return a valid result. Please try again.')
      }
      setState({ view: 'result', result: data as AuditResult, error: null })
    } catch (e) {
      const message =
        e instanceof TypeError
          ? 'Could not reach the analysis service. Please make sure the server is running and try again.'
          : (e as Error).message
      setState({ view: 'result', result: null, error: message })
    }
  }

  const handleReset = () => setState(initialState)

  if (state.view === 'loading') return <LoadingScreen />
  if (state.view === 'blocked') return <ResultScreen result={null} error={null} onReset={handleReset} blocked />
  if (state.view === 'result') {
    return <ResultScreen result={state.result} error={state.error} onReset={handleReset} />
  }
  return <UploadScreen onSubmit={handleSubmit} />
}
