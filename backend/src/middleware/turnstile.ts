import type { Request, Response, NextFunction } from 'express'
import { clientIp } from '../util/clientIp'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function createTurnstile(secret: string | undefined) {
  return async function turnstileMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!secret) return next()
    const token = (req.body ?? {}).turnstileToken
    if (!token || typeof token !== 'string') {
      return res.status(403).json({ error: 'verification_failed' })
    }
    try {
      const resp = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: token, remoteip: clientIp(req) }),
      })
      if (!resp.ok) throw new Error(`turnstile siteverify HTTP ${resp.status}`)
      const data = (await resp.json()) as { success?: boolean }
      if (data.success) return next()
    } catch (e) {
      console.error('turnstile verify failed:', (e as Error).message)
    }
    return res.status(403).json({ error: 'verification_failed' })
  }
}
