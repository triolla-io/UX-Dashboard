import type { Request, Response, NextFunction } from 'express'

interface IpRecord {
  count: number
  resetAt: number
}

export function createIpRateLimiter(maxUses: number, windowMs: number) {
  const records = new Map<string, IpRecord>()

  // Prune expired entries hourly to prevent unbounded memory growth
  const pruner = setInterval(() => {
    const now = Date.now()
    for (const [ip, record] of records) {
      if (record.resetAt <= now) records.delete(ip)
    }
  }, 60 * 60 * 1000)
  pruner.unref?.()

  return function ipRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ??
      req.socket.remoteAddress ??
      'unknown'

    const now = Date.now()
    const record = records.get(ip)

    if (!record || record.resetAt <= now) {
      records.set(ip, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (record.count >= maxUses) {
      return res.status(429).json({ error: 'usage_limit_reached' })
    }

    record.count++
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
