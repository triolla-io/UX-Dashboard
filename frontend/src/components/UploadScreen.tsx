import { useState, useRef, DragEvent, ChangeEvent } from 'react'

interface Props {
  onSubmit: (image: string, mediaType: string, context: string) => void
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please upload a PNG, JPG, or WEBP image.'
  }
  if (file.size > MAX_BYTES) {
    return 'File is too large. Max size is 10MB.'
  }
  return null
}

export default function UploadScreen({ onSubmit }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [context, setContext] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    const err = validateFile(f)
    setError(err)
    setFile(err ? null : f)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
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
      const base64 = dataUrl.split(',')[1]
      onSubmit(base64, file.type, context)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        data-testid="dropzone"
        style={{ border: '2px dashed #ccc', padding: '2rem', cursor: 'pointer' }}
      >
        {file ? file.name : 'Drop a screenshot here or click to browse'}
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          style={{ display: 'none' }}
          data-testid="file-input"
        />
      </div>

      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value.slice(0, 200))}
        placeholder="Describe the dashboard or its context (optional)"
        maxLength={200}
        data-testid="context-input"
      />

      <button
        onClick={handleSubmit}
        disabled={!file}
        data-testid="submit-button"
      >
        Get Feedback
      </button>
    </div>
  )
}
