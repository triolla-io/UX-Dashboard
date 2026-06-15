import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react'
import uploadIcon from '../assests/upload.svg'
import uploadIconHover from '../assests/upload_hover.svg'
const welcomeImg = '/welcomehomepage.svg'
import starIcon from '../assests/star.svg'
import triollaLogo from '../assests/triolla.svg'
import sparkIcon from '../assests/spark.svg'
import bannerImg from '../assests/Banner.png'

interface Props {
  onSubmit: (image: string, mediaType: string, context: string) => void
  serverBlocked?: boolean
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024
const USAGE_KEY = 'triolla_usage_count'
const MAX_FREE_USES = 2
const CALENDLY_URL = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ0uHSTPJ7s4d1EFxBgR1FK_dmpP9BP3DwkKbIggAvjjuFzVnFOpHjWfkzRvZB4BfZsGv4m-Fy1_?gv=true'

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please upload a PNG, JPG, or WEBP image.'
  }
  if (file.size > MAX_BYTES) {
    return 'File is too large. Max size is 10MB.'
  }
  return null
}

function getUsageCount(): number {
  return parseInt(localStorage.getItem(USAGE_KEY) || '0', 10)
}

function incrementUsage(): void {
  localStorage.setItem(USAGE_KEY, String(getUsageCount() + 1))
}

const SEGMENTS = [
  'Cybersecurity',
  'Digital Health',
  'Fintech & Finance',
  'Gaming',
  'Agritech',
  'B2C',
  'Devices & IoT',
  'Startups & Tech',
  'Mobile Apps',
  'SaaS Platforms',
  'B2B',
  'Dev',
]

export default function UploadScreen({ onSubmit, serverBlocked }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [selectedSegment, setSelectedSegment] = useState('')
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (serverBlocked) setShowBlockedModal(true)
  }, [serverBlocked])

  const readAndSubmit = (f: File, segment: string) => {
    if (getUsageCount() >= MAX_FREE_USES) {
      setShowBlockedModal(true)
      return
    }
    incrementUsage()
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      const context = segment ? `Industry segment: ${segment}` : ''
      onSubmit(base64, f.type, context)
    }
    reader.readAsDataURL(f)
  }

  const submitFile = (f: File) => {
    const err = validateFile(f)
    if (err) { setError(err); return }
    setError(null)
    setSelectedSegment('')
    setPendingFile(f)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 1) {
      setError('Please upload one file at a time.')
      return
    }
    const f = e.dataTransfer.files[0]
    if (f) submitFile(f)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) submitFile(f)
  }

  const handleModalSkip = () => {
    if (!pendingFile) return
    readAndSubmit(pendingFile, '')
    setPendingFile(null)
  }

  const handleModalContinue = () => {
    if (!pendingFile) return
    readAndSubmit(pendingFile, selectedSegment)
    setPendingFile(null)
  }

  return (
    <div>
      {/* Blocked modal */}
      {showBlockedModal && (
        <div
          className="seg-modal-overlay"
          data-testid="blocked-modal"
          onClick={() => setShowBlockedModal(false)}
        >
          <div className="locked-card" style={{ position: 'relative', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              data-testid="blocked-modal-close"
              onClick={() => setShowBlockedModal(false)}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.6)', fontSize: 20, lineHeight: 1, padding: 4,
              }}
              aria-label="Close"
            >✕</button>
            <div className="locked-title">You've used your free analyses</div>
            <div className="locked-tagline">Human Expertise. AI-Powered Analysis.</div>
            <div className="locked-desc">
              Want a deeper review? Book a free 30-minute session with a senior Triolla designer.
            </div>
            <button
              type="button"
              className="locked-cta"
              onClick={() => window.open(CALENDLY_URL, '_blank', 'noopener,noreferrer')}
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
      )}

      {/* Segment modal — shown after file is selected */}
      {pendingFile && (
        <div className="seg-modal-overlay" onClick={handleModalSkip}>
          <div className="seg-modal" onClick={e => e.stopPropagation()}>
            <p className="seg-modal-eyebrow">Optional</p>
            <h2 className="seg-modal-title">For more accurate results,<br />choose your segment</h2>
            <div className="seg-modal-pills">
              {SEGMENTS.map(s => (
                <button
                  key={s}
                  className={`seg-pill${selectedSegment === s ? ' seg-pill--active' : ''}`}
                  onClick={() => setSelectedSegment(prev => prev === s ? '' : s)}
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="seg-modal-actions">
              <button className="seg-btn-continue" onClick={handleModalContinue} type="button">Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="top-banner">
        <img src={sparkIcon} alt="" className="banner-spark" />
        Triolla AI Enterprise Dashboard Intelligence
      </div>

      {/* Nav */}
      <nav className="nav">
        <a href="https://triolla.io/" target="_blank" rel="noopener noreferrer"><img src={triollaLogo} alt="Triolla" className="nav-logo" /></a>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-avatar-group">
          <img src={welcomeImg} alt="Welcome!" className="hero-welcome-img" />
        </div>

        <p className="hero-subtitle">
          Hi there!
        </p>

        <h1 className="hero-title">
          Get a real feedback<br /> on your dashboard design
        </h1>

        <p className="hero-subtitle">
          Upload a screenshot and get <strong>Expert AI Analysis</strong> trained on 250+ dashboard projects we led in Triolla.
        </p>

        <div
          className={`dropzone-card${dragOver ? ' drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          data-testid="dropzone"
        >
          <div className="dropzone-icon-stack">
            <img src={uploadIcon} alt="" className="dropzone-icon dropzone-icon--rest" />
            <img src={uploadIconHover} alt="" className="dropzone-icon dropzone-icon--hover" />
          </div>
          <div className="dropzone-text">
            <p className="dropzone-label">Drop your dashboard screenshot</p>
            <p className="dropzone-hint">or browse files — PNG, JPG, JPEG · max 10MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            onChange={handleChange}
            style={{ display: 'none' }}
            data-testid="file-input"
          />
        </div>

        {error && (
          <p role="alert" className="upload-error">{error}</p>
        )}

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

      {/* Why Triolla */}
      <section className="why-section">
        <h2 className="why-heading">Why Triolla?</h2>
        <p className="why-sub">A practice built for enterprise dashboards</p>

        <div className="stats-row">
          <div className="stat-item">
            <div className="stat-number">600+</div>
            <div className="stat-label">Products Designed</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">250+</div>
            <div className="stat-label">Cybersecurity Platforms</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">65</div>
            <div className="stat-label">Expert Product Designers</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">15YR</div>
            <div className="stat-label">Enterprise UX Practice</div>
          </div>
        </div>
      </section>

      {/* Banner */}
      <section className="banner-section">
        <div className="banner-wrap">
          <img src={bannerImg} alt="Triolla clients and products" className="banner-img" />
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <a href="https://triolla.io/" target="_blank" rel="noopener noreferrer"><img src={triollaLogo} alt="Triolla" className="footer-logo" /></a>
      </footer>
    </div>
  )
}
