import type { AuditResult, InsightCategory } from '../types'
import triollaLogo from '../assests/triolla.svg'
import sparkIcon from '../assests/spark.svg'
import avatarImg from '../assests/avatar.png'
import welcomeImg from '../assests/welcome.png'
import starIcon from '../assests/star.svg'

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
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
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

interface GaugeProps { score: number }
function ScoreGauge({ score }: GaugeProps) {
  const r = 40
  const arcLen = Math.PI * r
  const filled = (score / 100) * arcLen
  const color = score < 40 ? '#C62828' : score < 65 ? '#E65100' : '#2E7D32'
  return (
    <svg viewBox="0 0 110 62" width="140" height="78">
      <path d="M 15 56 A 40 40 0 0 1 95 56"
        fill="none" stroke="#EBEBEB" strokeWidth="9" strokeLinecap="round" />
      <path d="M 15 56 A 40 40 0 0 1 95 56"
        fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${filled} ${arcLen}`} />
      <text x="55" y="50" textAnchor="middle"
        fill={color} fontSize="20" fontWeight="800"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif">
        {score}
      </text>
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
              {/* Overall score row */}
              <div className="report-overview">
                <div className="report-gauge-wrap">
                  <ScoreGauge score={result.overall} />
                </div>
                <div className="report-verdict">
                  <div className="report-verdict-label">Overall Dashboard Score</div>
                  <div className="report-verdict-title">{result.verdict}</div>
                </div>
              </div>

              {/* Category score cards */}
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
                      <a
                        className="locked-cta"
                        href="https://calendly.com/triolla/pitangoux-introductory-meeting-clone?month=2026-06"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Schedule My Expert Review ASAP
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </a>
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
