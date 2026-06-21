import type { Request, Response, NextFunction } from 'express'
import type { UsageStore } from '../usage'
import { clientIp } from '../util/clientIp'

export function startOfDayUtc(now: number): number {
  const d = new Date(now)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

// Per-IP limit backed by the usage log: counts successful audits in the window.
export function createIpRateLimiter(
  store: UsageStore,
  maxUses: number,
  windowMs: number,
  now: () => number = Date.now
) {
  return function ipRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const ip = clientIp(req)
    if (store.countByIpSince(ip, now() - windowMs) >= maxUses) {
      return res.status(429).json({ error: 'usage_limit_reached' })
    }
    next()
  }
}

// Hard global cap on audits per UTC day. cap=null disables it.
export function createGlobalDailyCap(
  store: UsageStore,
  cap: number | null,
  now: () => number = Date.now
) {
  return function globalDailyCapMiddleware(_req: Request, res: Response, next: NextFunction) {
    if (cap === null) return next()
    if (store.countSince(startOfDayUtc(now())) >= cap) {
      return res.status(429).json({ error: 'service_busy' })
    }
    next()
  }
}

export function createGlobalRateLimiter(maxPerWindow: number, windowMs: number) {
  let count = 0
  let windowStart = Date.now()

  return function globalRateLimitMiddleware(_req: Request, res: Response, next: NextFunction) {
    const now = Date.now()
    if (now - windowStart > windowMs) {
      count = 0
      windowStart = now
    }

    if (count >= maxPerWindow) {
      return res.status(429).json({ error: 'service_busy' })
    }

    count++
    next()
  }
}
