export default function LoadingScreen() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <div role="status" aria-label="Loading" style={{ fontSize: '2rem' }}>⏳</div>
      <p>Analyzing your dashboard…</p>
    </div>
  )
}
