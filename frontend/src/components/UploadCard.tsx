import { useState, useRef, DragEvent, ChangeEvent } from 'react'

interface Props {
  onSubmit: (image: string, mediaType: string, context: string) => void
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Please upload a PNG, JPG, or WEBP image.'
  if (file.size > MAX_BYTES) return 'File is too large. Max size is 10MB.'
  return null
}

const UploadIconRest = () => (
  <svg className="dropzone-icon dropzone-icon--rest" viewBox="0 0 52 52" fill="none">
    <rect width="52" height="52" rx="14" fill="var(--purple-soft)"/>
    <rect x="16" y="14" width="18" height="18" rx="4" fill="#fff" stroke="#B7A4F2" strokeWidth="1.6"/>
    <rect x="20" y="20" width="18" height="18" rx="4" fill="#fff" stroke="var(--purple)" strokeWidth="1.8"/>
    <circle cx="25" cy="25" r="1.8" fill="var(--purple)"/>
    <path d="M22 33l4.5-4.5 3 3 3.5-3.5L36 31" stroke="var(--purple)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const UploadIconHover = () => (
  <svg className="dropzone-icon dropzone-icon--hover" viewBox="0 0 52 52" fill="none">
    <rect width="52" height="52" rx="14" fill="var(--purple)"/>
    <path d="M26 34V19M26 19L20.5 24.5M26 19L31.5 24.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 36h16" stroke="#fff" strokeOpacity="0.85" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
)

export default function UploadCard({ onSubmit }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [context, setContext] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    const err = validateFile(f)
    setError(err)
    setFile(err ? null : f)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const handleSubmit = () => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      onSubmit(dataUrl.split(',')[1], file.type, context)
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <div
        className={`dropzone-card${dragOver ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        data-testid="dropzone"
      >
        <div className="dropzone-icon-stack">
          <UploadIconRest />
          <UploadIconHover />
        </div>
        {file ? (
          <p className="dropzone-filename">{file.name}</p>
        ) : (
          <>
            <p className="dropzone-label">Drop your dashboard screenshot</p>
            <p className="dropzone-hint">or browse files — PNG, JPG, JPEG · max 10MB</p>
          </>
        )}
        <input ref={inputRef} type="file" onChange={handleChange} style={{ display: 'none' }} data-testid="file-input" />
      </div>

      {error && <p role="alert" className="upload-error">{error}</p>}

      <div className="context-wrap">
        <button className="context-toggle" onClick={() => setShowContext(s => !s)} type="button">
          {showContext ? 'Hide context' : '+ Add context (optional)'}
        </button>
        {showContext && (
          <textarea
            className="context-textarea"
            value={context}
            onChange={(e) => setContext(e.target.value.slice(0, 200))}
            placeholder="Describe the dashboard or its context…"
            maxLength={200}
            data-testid="context-input"
          />
        )}
      </div>

      <button className="submit-btn" onClick={handleSubmit} disabled={!file} data-testid="submit-button">
        Analyze My Dashboard →
      </button>
    </>
  )
}
