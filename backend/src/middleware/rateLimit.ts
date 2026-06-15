import type { Request, Response, NextFunction } from 'express'

export function createRateLimiter(maxUses: number) {
  const counts = new Map<string, number>()

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ??
      req.ip ??
      'unknown'

    const current = counts.get(ip) ?? 0
    if (current >= maxUses) {
      return res.status(429).json({ error: 'usage_limit_reached' })
    }
    counts.set(ip, current + 1)
    next()
  }
}
