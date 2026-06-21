import { useEffect, useRef } from 'react'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        }
      ) => string
      remove?: (id: string) => void
    }
  }
}

function loadScript(): void {
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return
  const s = document.createElement('script')
  s.src = SCRIPT_SRC
  s.async = true
  s.defer = true
  document.head.appendChild(s)
}

/**
 * Cloudflare Turnstile bot-check widget. Calls `onToken` with the verification
 * token (and with '' when it expires or errors). Renders nothing when no site
 * key is configured, so local/dev builds work without Turnstile.
 */
export default function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  // Keep the latest callback in a ref so the render effect runs only once.
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!SITE_KEY) return
    loadScript()
    let cancelled = false

    const tryRender = () => {
      if (cancelled) return
      if (window.turnstile && containerRef.current && widgetId.current === null) {
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => onTokenRef.current(''),
        })
      } else if (!window.turnstile) {
        setTimeout(tryRender, 300)
      }
    }
    tryRender()

    return () => {
      cancelled = true
      if (widgetId.current !== null) {
        window.turnstile?.remove?.(widgetId.current)
        widgetId.current = null
      }
    }
  }, [])

  if (!SITE_KEY) return null
  return (
    <div
      ref={containerRef}
      className="turnstile-widget"
      style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}
    />
  )
}
