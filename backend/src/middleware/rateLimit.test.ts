import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRateLimiter } from './rateLimit'
import type { Request, Response, NextFunction } from 'express'

function makeReq(ip: string): Request {
  return { ip, headers: {} } as unknown as Request
}

function makeRes() {
  const res = {
    _status: 200,
    _body: null as unknown,
    status(code: number) { this._status = code; return this },
    json(body: unknown) { this._body = body; return this },
  }
  return res as unknown as Response & { _status: number; _body: unknown }
}

describe('createRateLimiter', () => {
  let limiter: ReturnType<typeof createRateLimiter>

  beforeEach(() => {
    limiter = createRateLimiter(2)
  })

  it('allows the first two requests from same IP', () => {
    const next = vi.fn()
    limiter(makeReq('1.2.3.4'), makeRes(), next)
    limiter(makeReq('1.2.3.4'), makeRes(), next)
    expect(next).toHaveBeenCalledTimes(2)
  })

  it('blocks the third request from same IP with 429', () => {
    const next = vi.fn()
    limiter(makeReq('1.2.3.4'), makeRes(), next)
    limiter(makeReq('1.2.3.4'), makeRes(), next)
    const res = makeRes()
    limiter(makeReq('1.2.3.4'), res, next)
    expect(next).toHaveBeenCalledTimes(2)
    expect(res._status).toBe(429)
    expect((res._body as { error: string }).error).toBe('usage_limit_reached')
  })

  it('does not block a different IP', () => {
    const next = vi.fn()
    limiter(makeReq('1.2.3.4'), makeRes(), next)
    limiter(makeReq('1.2.3.4'), makeRes(), next)
    limiter(makeReq('9.9.9.9'), makeRes(), next)
    expect(next).toHaveBeenCalledTimes(3)
  })

  it('uses x-forwarded-for header over req.ip', () => {
    const next = vi.fn()
    const reqWithHeader = { ip: '9.9.9.9', headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } } as unknown as Request
    limiter(reqWithHeader, makeRes(), next)
    limiter(reqWithHeader, makeRes(), next)
    // third request from same forwarded IP should be blocked
    const res = makeRes()
    limiter(reqWithHeader, res, next)
    expect(next).toHaveBeenCalledTimes(2)
    expect(res._status).toBe(429)
  })
})
