interface Props {
  feedback: string
  error: string | null
  onReset: () => void
}

export default function ResultScreen({ feedback, error, onReset }: Props) {
  const handleDownload = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const blob = new Blob([feedback], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard-feedback-${timestamp}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '2rem' }}>
      {error ? (
        <p role="alert" style={{ color: 'red' }}>{error}</p>
      ) : (
        <>
          <pre
            data-testid="feedback-text"
            style={{ whiteSpace: 'pre-wrap', border: '1px solid #ccc', padding: '1rem' }}
          >
            {feedback}
          </pre>
          <button onClick={handleDownload} data-testid="download-button">
            Download TXT
          </button>
        </>
      )}
      <button onClick={onReset} data-testid="reset-button" style={{ marginLeft: '1rem' }}>
        Start Over
      </button>
    </div>
  )
}
