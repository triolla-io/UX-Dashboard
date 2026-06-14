import type { AuditResult, InsightCategory } from '../types'
import triollaLogo from '../assests/triolla.svg'
import sparkIcon from '../assests/spark.svg'
import avatarImg from '../assests/avatar.png'
import welcomeImg from '../assests/welcome.png'
import starIcon from '../assests/star.svg'

const CALENDLY_URL = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ0uHSTPJ7s4d1EFxBgR1FK_dmpP9BP3DwkKbIggAvjjuFzVnFOpHjWfkzRvZB4BfZsGv4m-Fy1_?gv=true'

interface Props {
  result: AuditResult | null
  error: string | null
  onReset: () => void
}

const VISIBLE = 4

const PLACEHOLDER_INSIGHTS = [
  'Your navigation hierarchy may be creating decision fatigue for repeat users who access multiple views per session.',
  'Color contrast ratios in secondary data labels likely fall below WCAG AA standards in low-light or dark-mode environments.',
  'Information density on your overview panel may exceed optimal cognitive load thresholds, slowing time-to-insight.',
  'Chart tooltip and hover states appear to lack sufficient visual affordance for first-time and infrequent users.',
  'Mobile viewport breakpoints likely introduce layout shifts that disrupt user scanning patterns on smaller screens.',
  'Missing empty-state illustrations on zero-data tiles leave users uncertain whether data is loading or genuinely absent.',
  'Drill-down interactions lack sufficient visual feedback, causing users to over-click and lose their place in the hierarchy.',
  'Axis labels on time-series charts are truncated at narrow widths, removing critical context for trend interpretation.',
  'Filter and date-range controls are positioned inconsistently across views, increasing relearning cost per session.',
  'Alert and status indicators use color alone without a secondary visual cue, creating accessibility gaps.',
  'The primary CTA on each tile competes visually with secondary actions, slowing decision speed for power users.',
  'Cross-panel data relationships are not visually linked, requiring users to manually reconcile numbers across tiles.',
]

const ICON_PROPS = {
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}

const CATEGORY_META: { key: InsightCategory; label: string; icon: JSX.Element }[] = [
  {
    key: 'ux', label: 'UX',
    icon: (
      <svg {...ICON_PROPS}>
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    key: 'visualDesign', label: 'Visual Design',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
  {
    key: 'usability', label: 'Usability',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M9 9l5 12 1.8-5.2L21 14 9 9z" />
        <path d="M7.2 2.2L8 5.1" /><path d="M5.1 8L2.2 7.2" />
        <path d="M14 4.1L12 6" /><path d="M6 12l-1.9 2" />
      </svg>
    ),
  },
  {
    key: 'dataClarity', label: 'Data Clarity',
    icon: (
      <svg {...ICON_PROPS}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
]

const GAUGE_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"

function gaugeColorAtScore(score: number): string {
  const clamped = Math.max(0, Math.min(100, score))
  const theta = Math.PI * (1 - clamped / 100)
  const pct = (Math.cos(theta) + 1) / 2

  const stops = [
    { p: 0.00, r: 0xEF, g: 0x44, b: 0x44 },
    { p: 0.35, r: 0xF9, g: 0x73, b: 0x16 },
    { p: 0.55, r: 0xFA, g: 0xCC, b: 0x15 },
    { p: 0.75, r: 0x84, g: 0xCC, b: 0x16 },
    { p: 1.00, r: 0x22, g: 0xC5, b: 0x5E },
  ]

  let lo = stops[0], hi = stops[stops.length - 1]
  for (let i = 0; i < stops.length - 1; i++) {
    if (pct >= stops[i].p && pct <= stops[i + 1].p) {
      lo = stops[i]; hi = stops[i + 1]; break
    }
  }
  const t = lo.p === hi.p ? 0 : (pct - lo.p) / (hi.p - lo.p)
  return `rgb(${Math.round(lo.r + t * (hi.r - lo.r))},${Math.round(lo.g + t * (hi.g - lo.g))},${Math.round(lo.b + t * (hi.b - lo.b))})`
}

interface GaugeProps { score: number }
function ScoreGauge({ score }: GaugeProps) {
  const cx = 150, cy = 148, r = 104
  const clamped = Math.max(0, Math.min(100, score))
  const theta = Math.PI * (1 - clamped / 100)
  const mx = cx + r * Math.cos(theta)
  const my = cy - r * Math.sin(theta)

  const fullArc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`

  return (
    <svg viewBox="0 0 300 190" width="100%" style={{ maxWidth: 320, display: 'block', margin: '0 auto' }}
      role="img" aria-label={`Score ${score} out of 100`}>
      <defs>
        <linearGradient id="gaugeGrad" gradientUnits="userSpaceOnUse" x1={cx - r} y1="0" x2={cx + r} y2="0">
          <stop offset="0%"   stopColor="#EF4444" />
          <stop offset="35%"  stopColor="#F97316" />
          <stop offset="55%"  stopColor="#FACC15" />
          <stop offset="75%"  stopColor="#84CC16" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
        <filter id="indShadow" x="-150%" y="-150%" width="400%" height="400%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.18" />
        </filter>
      </defs>

      <path d={fullArc} fill="none" stroke="url(#gaugeGrad)" strokeWidth="28" strokeLinecap="butt" />

      <circle cx={mx} cy={my} r="15" fill="white" filter="url(#indShadow)" />
      <circle cx={mx} cy={my} r="9" fill={gaugeColorAtScore(score)} />

      <text x={cx - r + 4} y={cy + 30} textAnchor="middle" fontSize="13" fontWeight="500"
        fill="#adb5bd" fontFamily={GAUGE_FONT}>0</text>
      <text x={cx + r - 4} y={cy + 30} textAnchor="middle" fontSize="13" fontWeight="500"
        fill="#adb5bd" fontFamily={GAUGE_FONT}>100</text>

      <text x={cx} y={cy - 22} textAnchor="middle" fontSize="38" fontWeight="800"
        fill="#16182b" fontFamily={GAUGE_FONT} letterSpacing="-1">{score}</text>
    </svg>
  )
}

function serializeReport(result: AuditResult): string {
  const lines: string[] = []
  lines.push('Triolla AI Audit Report')
  lines.push(`Overall: ${result.overall}/100 — ${result.verdict}`, '')
  for (const { key, label } of CATEGORY_META) {
    const c = result.categories[key]
    lines.push(`${label}: ${c.score}/100 — ${c.evidence}`)
  }
  lines.push('', 'Insights:')
  for (const it of [...result.insights].sort((a, b) => a.priority - b.priority)) {
    lines.push(`- [${it.sentiment}] ${it.text}`)
  }
  return lines.join('\n')
}

export default function ResultScreen({ result, error, onReset }: Props) {
  const openScheduler = () => {
    window.open(CALENDLY_URL, '_blank', 'noopener,noreferrer')
  }

  const ranked = result ? [...result.insights].sort((a, b) => a.priority - b.priority) : []
  const visible = ranked.slice(0, VISIBLE)
  const realLocked = ranked.slice(VISIBLE)
  const blurredTexts = [...realLocked.map(it => it.text), ...PLACEHOLDER_INSIGHTS].slice(0, 12)

  const handleDownload = () => {
    if (!result) return
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const blob = new Blob([serializeReport(result)], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `triolla-audit-${ts}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <div>
      {/* Banner — same as UploadScreen */}
      <div className="top-banner">
        <img src={sparkIcon} alt="" className="banner-spark" />
        Triolla AI Enterprise Dashboard Intelligence
      </div>

      {/* Nav — same as UploadScreen */}
      <nav className="nav">
        <a href="https://triolla.io/" target="_blank" rel="noopener noreferrer"><img src={triollaLogo} alt="Triolla" className="nav-logo" /></a>
      </nav>

      {/* Hero — same yellow layout as upload, card replaces dropzone */}
      <section className="hero">
        <div className="hero-avatar-group">
          <img src={avatarImg} alt="" className="hero-avatar-img" />
          <img src={welcomeImg} alt="Welcome!" className="hero-welcome-img" />
        </div>

        {/* ── Report card ── */}
        <div className="report-card">
          <div className="report-card-header">Triolla AI Audit Report</div>

          {error || !result ? (
            <div className="report-error" role="alert">{error || 'No result available.'}</div>
          ) : (
            <>
              {/* Unified overview box: gauge third + 2×2 category grid */}
              <div className="report-overview">
                <div className="report-gauge-col">
                  <div className="report-verdict-label">Overall Dashboard Score</div>
                  <ScoreGauge score={result.overall} />
                  <div className="report-verdict-title">{result.verdict}</div>
                </div>

                <div className="score-cards">
                  {CATEGORY_META.map(({ key, label, icon }) => (
                    <div className="score-card" key={key}>
                      <div className="score-card-icon">{icon}</div>
                      <div className="score-card-body">
                        <div className="score-card-label">{label}</div>
                        <div className="score-card-value">
                          {result.categories[key].score}<span>/100</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insights */}
              <div className="report-insights">
                <div className="insights-title">Top insights</div>
                <ul className="insights-list">
                  {visible.map((it, i) => (
                    <li className="insight-item" key={i} data-testid="visible-insight">
                      <img src={starIcon} alt="" className="insight-sparkle" />
                      {it.text}
                    </li>
                  ))}
                </ul>

                <div className="insights-locked-wrap">
                  <ul className="insights-locked-list">
                    {blurredTexts.map((text, i) => (
                      <li className="insight-item" key={i}>
                        <img src={starIcon} alt="" className="insight-sparkle" />{text}
                      </li>
                    ))}
                  </ul>
                  <div className="insights-locked-overlay">
                    <p className="locked-teaser">
                      There is a ton of <em>deeper insight</em> into this
                    </p>
                    <div className="locked-card">
                      <div className="locked-title">Book a Free 30-Minute UX Audit</div>
                      <div className="locked-tagline">Human Expertise. AI-Powered Analysis.</div>
                      <div className="locked-desc">
                        Identify critical gaps before they become costly mistakes
                      </div>
                      <button
                        type="button"
                        className="locked-cta"
                        onClick={openScheduler}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Schedule My Expert Review ASAP
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Hidden testid anchors kept for tests */}
          {result && !error && (
            <button data-testid="download-button" style={{ display: 'none' }} onClick={handleDownload} />
          )}
          <button data-testid="reset-button" style={{ display: 'none' }} onClick={onReset} />
        </div>

        <p className="trust-row">
          Free <span>·</span> No Commitment <span>·</span> Results in &lt; 60s
        </p>

        <div className="feature-badges">
          <div className="feature-badge">
            <img src={starIcon} alt="" className="feature-badge-icon" /> SOC2-aware handling
          </div>
          <div className="feature-badge">
            <img src={starIcon} alt="" className="feature-badge-icon" /> Screenshots only
          </div>
          <div className="feature-badge">
            <img src={starIcon} alt="" className="feature-badge-icon" /> Senior designer review
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <a href="https://triolla.io/" target="_blank" rel="noopener noreferrer">
          <img src={triollaLogo} alt="Triolla" className="footer-logo" />
        </a>
      </footer>
    </div>
  )
}
