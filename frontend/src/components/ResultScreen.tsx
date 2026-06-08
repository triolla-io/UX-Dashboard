import type { AuditResult, InsightCategory } from '../types'

interface Props {
  result: AuditResult | null
  error: string | null
  onReset: () => void
}

const VISIBLE = 4

const CATEGORY_META: { key: InsightCategory; label: string; icon: string }[] = [
  { key: 'ux', label: 'UX', icon: '⊞' },
  { key: 'visualDesign', label: 'Visual Design', icon: '✏' },
  { key: 'usability', label: 'Usability', icon: '✦' },
  { key: 'dataClarity', label: 'Data Clarity', icon: '▦' },
]

interface GaugeProps { score: number; size?: number }
function ScoreGauge({ score, size = 110 }: GaugeProps) {
  const r = 40
  const cx = 55
  const arcLen = Math.PI * r
  const filled = (score / 100) * arcLen
  const color = score < 40 ? '#C62828' : score < 65 ? '#E65100' : '#2E7D32'
  return (
    <svg viewBox="0 0 110 58" width={size} height={size * 0.53}>
      <path d={`M 15 52 A ${r} ${r} 0 0 1 95 52`} fill="none" stroke="#EBEBEB" strokeWidth="9" strokeLinecap="round" />
      <path d={`M 15 52 A ${r} ${r} 0 0 1 95 52`} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${filled} ${arcLen}`} />
      <text x={cx} y="46" textAnchor="middle" fill={color} fontSize="20" fontWeight="800" fontFamily="Syne, sans-serif">
        {score}
      </text>
    </svg>
  )
}

function serializeReport(result: AuditResult): string {
  const lines: string[] = []
  lines.push(`Triolla AI Audit Report`)
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
  const lockedItems = ranked.slice(VISIBLE)

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
      <div className="top-banner"><span>✨</span> Triolla AI Enterprise Dashboard Intelligence</div>
      <nav className="nav">
        <div className="nav-logo">triolla</div>
        <button className="nav-cta">Contact Us</button>
      </nav>

      <section className="result-hero">
        <div className="report-card">
          <div className="report-card-header">Triolla AI Audit Report</div>

          {error || !result ? (
            <div className="report-error" role="alert">{error || 'No result available.'}</div>
          ) : (
            <>
              <div className="report-overview">
                <div className="report-gauge-wrap"><ScoreGauge score={result.overall} size={110} /></div>
                <div className="report-verdict">
                  <div className="report-verdict-label">Overall Dashboard Score</div>
                  <div className="report-verdict-title">{result.verdict}</div>
                </div>
              </div>

              <div className="score-cards">
                {CATEGORY_META.map(({ key, label, icon }) => (
                  <div className="score-card" key={key}>
                    <div className="score-card-icon">{icon}</div>
                    <div className="score-card-label">{label}</div>
                    <div className="score-card-value">{result.categories[key].score}<span>/100</span></div>
                  </div>
                ))}
              </div>

              <div className="report-insights">
                <div className="insights-title">Top insights</div>
                <ul className="insights-list">
                  {visible.map((it, i) => (
                    <li className="insight-item" key={i} data-testid="visible-insight">
                      <span className="insight-star">✦</span>{it.text}
                    </li>
                  ))}
                </ul>

                {lockedItems.length > 0 && (
                  <div className="insights-locked-wrap">
                    <ul className="insights-locked-list">
                      {lockedItems.slice(0, 8).map((it, i) => (
                        <li className="insight-item" key={i}>
                          <span className="insight-star">✦</span>{it.text}
                        </li>
                      ))}
                    </ul>
                    <div className="insights-locked-overlay">
                      <div className="lock-icon-wrap">🔒</div>
                      <div className="locked-title">{lockedItems.length}+ insights are locked</div>
                      <div className="locked-desc">
                        Contact Triolla to unlock the complete professional review with a free expert consultation
                      </div>
                      <button className="locked-cta">Contact Us</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="report-actions">
            {result && !error && (
              <button className="action-btn" onClick={handleDownload} data-testid="download-button">
                ↓ Download Report
              </button>
            )}
            <button className="action-btn" onClick={onReset} data-testid="reset-button">
              ← Analyze Another
            </button>
          </div>
        </div>

        <p className="trust-row" style={{ marginTop: 20 }}>
          Free <span>·</span> No Commitment <span>·</span> Results in &lt; 60s
        </p>
      </section>
    </div>
  )
}
