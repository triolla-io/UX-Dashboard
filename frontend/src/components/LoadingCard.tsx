import { useEffect, useState } from 'react'

const STEPS = [
  'Analyzing information hierarchy',
  'Evaluating dashboard readability',
  'Detecting usability friction points',
  'Reviewing visual consistency',
  'Benchmarking enterprise patterns',
]

const STEP_MS = 2600

function StepRing() {
  return (
    <svg className="step-ring" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--purple-soft)" strokeWidth="2.5" />
      <circle
        cx="12" cy="12" r="9" fill="none" stroke="var(--purple)" strokeWidth="2.5"
        strokeLinecap="round" strokeDasharray="56.5" strokeDashoffset="40"
      />
    </svg>
  )
}

function StepCheck() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="var(--purple)" strokeWidth="1.6" opacity="0.55" />
      <path d="M8 12.2l2.6 2.6L16 9.4" fill="none" stroke="var(--purple)" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StepDot() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="#D6D6DE" strokeWidth="1.6" />
    </svg>
  )
}

export default function LoadingCard() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => Math.min(a + 1, STEPS.length - 1))
    }, STEP_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="loading-card" role="status" aria-label="Scanning your dashboard">
      <div className="scan-copy">
        <h2 className="scan-title">Scanning your<br />Dashboard</h2>
        <p className="scan-sub">This may take a few seconds…</p>

        <ul className="scan-steps">
          {STEPS.map((label, i) => {
            const status = i < active ? 'done' : i === active ? 'active' : 'todo'
            return (
              <li className={`scan-step is-${status}`} key={label}>
                <span className="scan-step-icon">
                  {status === 'done' ? <StepCheck /> : status === 'active' ? <StepRing /> : <StepDot />}
                </span>
                <span className="scan-step-label">{label}</span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="scan-stage" aria-hidden="true">
        <div className="scan-window">
          <div className="scan-sidebar">
            <span /><span /><span /><span />
          </div>
          <div className="scan-main">
            <div className="scan-head">
              <div className="scan-head-lines">
                <i className="bar w-55" />
                <i className="bar w-40" />
              </div>
              <div className="scan-block sm" />
            </div>
            <div className="scan-body">
              <div className="scan-chart" />
              <div className="scan-body-lines">
                <i className="bar w-70" />
                <i className="bar w-85" />
                <i className="bar w-50" />
              </div>
            </div>
            <div className="scan-rows">
              <i /><i /><i /><i />
            </div>
          </div>
        </div>
        <div className="scan-beam" />
      </div>
    </div>
  )
}
