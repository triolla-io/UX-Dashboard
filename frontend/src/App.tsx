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
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again later.')
      }
      setState({ view: 'result', feedback: data.feedback, error: null })
    } catch (e) {
      setState({
        view: 'result',
        feedback: '',
        error: (e as Error).message,
      })
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
