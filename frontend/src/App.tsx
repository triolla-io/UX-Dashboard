import { useState } from 'react'
import { FeedbackState } from './types'
import UploadScreen from './components/UploadScreen'
import LoadingScreen from './components/LoadingScreen'
import ResultScreen from './components/ResultScreen'

const initialState: FeedbackState = {
  view: 'upload',
  feedback: '',
  error: null,
}

export default function App() {
  const [state, setState] = useState<FeedbackState>(initialState)

  const handleSubmit = async (image: string, mediaType: string, context: string) => {
    setState({ view: 'loading', feedback: '', error: null })
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mediaType, context }),
      })

      const raw = await res.text()
      let data: { feedback?: string; error?: string } = {}
      if (raw) {
        try {
          data = JSON.parse(raw)
        } catch {
          throw new Error(
            'The analysis service returned an unexpected response. Please make sure the server is running and try again.'
          )
        }
      }

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again later.')
      }
      if (!data.feedback) {
        throw new Error('The analysis service did not return any feedback. Please try again.')
      }
      setState({ view: 'result', feedback: data.feedback, error: null })
    } catch (e) {
      const message =
        e instanceof TypeError
          ? 'Could not reach the analysis service. Please make sure the server is running and try again.'
          : (e as Error).message
      setState({ view: 'result', feedback: '', error: message })
    }
  }

  const handleReset = () => setState(initialState)

  if (state.view === 'loading') return <LoadingScreen />
  if (state.view === 'result') {
    return (
      <ResultScreen
        feedback={state.feedback}
        error={state.error}
        onReset={handleReset}
      />
    )
  }
  return <UploadScreen onSubmit={handleSubmit} />
}
