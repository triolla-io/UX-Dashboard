import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createIpRateLimiter, createGlobalRateLimiter } from './rateLimit'
import type { Request, Response, NextFunction } from 'express'

function makeReq(ip: string): Request {
  return { socket: { remoteAddress: ip }, headers: {} } as unknown as Request
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

const ONE_DAY = 24 * 60 * 60 * 1000

describe('createIpRateLimiter', () => {
  let limiter: ReturnType<typeof createIpRateLimiter>

  beforeEach(() => {
    vi.useFakeTimers()
    limiter = createIpRateLimiter(2, ONE_DAY)
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

  it('uses x-forwarded-for header over socket.remoteAddress', () => {
    const next = vi.fn()
    const reqWithHeader = { socket: { remoteAddress: '9.9.9.9' }, headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } } as unknown as Request
    limiter(reqWithHeader, makeRes(), next)
    limiter(reqWithHeader, makeRes(), next)
    const res = makeRes()
    limiter(reqWithHeader, res, next)
    expect(next).toHaveBeenCalledTimes(2)
    expect(res._status).toBe(429)
  })

  it('resets after the window expires', () => {
    const next = vi.fn()
    limiter(makeReq('1.2.3.4'), makeRes(), next)
    limiter(makeReq('1.2.3.4'), makeRes(), next)
    vi.advanceTimersByTime(ONE_DAY + 1)
    limiter(makeReq('1.2.3.4'), makeRes(), next)
    expect(next).toHaveBeenCalledTimes(3)
  })
})

describe('createGlobalRateLimiter', () => {
  let limiter: ReturnType<typeof createGlobalRateLimiter>

  beforeEach(() => {
    vi.useFakeTimers()
    limiter = createGlobalRateLimiter(3, 60_000)
  })

  it('allows requests up to the global limit', () => {
    const next = vi.fn()
    limiter(makeReq('1.1.1.1'), makeRes(), next)
    limiter(makeReq('2.2.2.2'), makeRes(), next)
    limiter(makeReq('3.3.3.3'), makeRes(), next)
    expect(next).toHaveBeenCalledTimes(3)
  })

  it('blocks once global limit is reached', () => {
    const next = vi.fn()
    limiter(makeReq('1.1.1.1'), makeRes(), next)
    limiter(makeReq('2.2.2.2'), makeRes(), next)
    limiter(makeReq('3.3.3.3'), makeRes(), next)
    const res = makeRes()
    limiter(makeReq('4.4.4.4'), res, next)
    expect(next).toHaveBeenCalledTimes(3)
    expect(res._status).toBe(429)
    expect((res._body as { error: string }).error).toBe('service_busy')
  })

  it('resets after the window expires', () => {
    const next = vi.fn()
    limiter(makeReq('1.1.1.1'), makeRes(), next)
    limiter(makeReq('2.2.2.2'), makeRes(), next)
    limiter(makeReq('3.3.3.3'), makeRes(), next)
    vi.advanceTimersByTime(60_001)
    limiter(makeReq('4.4.4.4'), makeRes(), next)
    expect(next).toHaveBeenCalledTimes(4)
  })
})
