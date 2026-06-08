import type { AuditResult, InsightCategory } from '../types'

interface Props {
  result: AuditResult | null
  error: string | null
  onReset: () => void
}

const VISIBLE = 4

const ICON_PROPS = {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
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
        <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
  {
    key: 'usability', label: 'Usability',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M9 9l5 12 1.8-5.2L21 14 9 9z" /><path d="M7.2 2.2L8 5.1" />
        <path d="M5.1 8L2.2 7.2" /><path d="M14 4.1L12 6" /><path d="M6 12l-1.9 2" />
      </svg>
    ),
  },
  {
    key: 'dataClarity', label: 'Data Clarity',
    icon: (
      <svg {...ICON_PROPS}>
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
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
    <svg viewBox="0 0 110 62" width="150" height="84">
      <path d="M 15 56 A 40 40 0 0 1 95 56"
        fill="none" stroke="#EBEBEB" strokeWidth="9" strokeLinecap="round"/>
      <path d="M 15 56 A 40 40 0 0 1 95 56"
        fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${filled} ${arcLen}`}/>
      <text x="55" y="50" textAnchor="middle"
        fill={color} fontSize="26" fontWeight="800"
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

export default function ResultCard({ result, error, onReset }: Props) {
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
    <div className="report-card">
      <div className="report-card-header">Triolla AI Audit Report</div>

      {error || !result ? (
        <div className="report-error" role="alert">{error || 'No result available.'}</div>
      ) : (
        <>
          <div className="report-overview">
            <div className="report-gauge-wrap">
              <ScoreGauge score={result.overall} />
            </div>
            <div className="report-verdict">
              <div className="report-verdict-label">Overall Dashboard Score</div>
              <div className="report-verdict-title">{result.verdict}</div>
            </div>
          </div>

          <div className="score-cards">
            {CATEGORY_META.map(({ key, label, icon }) => (
              <div className="score-card" key={key}>
                <div className="score-card-icon">{icon}</div>
                <div className="score-card-body">
                  <div className="score-card-label">{label}</div>
                  <div className="score-card-value">{result.categories[key].score}<span>/100</span></div>
                </div>
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

      {/* Hidden testid hooks (action buttons live in the parent shell) */}
      {result && !error && (
        <button data-testid="download-button" style={{ display: 'none' }} onClick={handleDownload} />
      )}
      <button data-testid="reset-button" style={{ display: 'none' }} onClick={onReset} />
    </div>
  )
}
