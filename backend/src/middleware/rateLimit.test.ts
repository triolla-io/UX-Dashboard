import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createIpRateLimiter, createGlobalDailyCap, createGlobalRateLimiter, startOfDayUtc } from './rateLimit'
import { createUsageStore } from '../usage'
import type { Request, Response, NextFunction } from 'express'

function makeReq(ip: string): Request {
  return { socket: { remoteAddress: ip }, headers: {} } as unknown as Request
}
function makeRes() {
  const res = {
    _status: 200, _body: null as unknown,
    status(code: number) { this._status = code; return this },
    json(body: unknown) { this._body = body; return this },
  }
  return res as unknown as Response & { _status: number; _body: unknown }
}

const ONE_DAY = 24 * 60 * 60 * 1000

describe('startOfDayUtc', () => {
  it('floors to UTC midnight', () => {
    const t = Date.parse('2026-06-21T15:30:00Z')
    expect(startOfDayUtc(t)).toBe(Date.parse('2026-06-21T00:00:00Z'))
  })
})

describe('createIpRateLimiter (count-based)', () => {
  it('allows up to maxUses recorded audits then blocks', () => {
    const store = createUsageStore(':memory:')
    const now = 10 * ONE_DAY
    const limiter = createIpRateLimiter(store, 2, ONE_DAY, () => now)
    const next = vi.fn()

    // 0 prior rows -> allowed; simulate a successful audit by recording
    limiter(makeReq('1.2.3.4'), makeRes(), next)
    store.record({ ip: '1.2.3.4', at: now })
    // 1 prior row -> allowed
    limiter(makeReq('1.2.3.4'), makeRes(), next)
    store.record({ ip: '1.2.3.4', at: now })
    // 2 prior rows -> blocked
    const res = makeRes()
    limiter(makeReq('1.2.3.4'), res, next)

    expect(next).toHaveBeenCalledTimes(2)
    expect(res._status).toBe(429)
    expect((res._body as { error: string }).error).toBe('usage_limit_reached')
  })

  it('does not count rows outside the window', () => {
    const store = createUsageStore(':memory:')
    const now = 10 * ONE_DAY
    store.record({ ip: '1.2.3.4', at: now - 2 * ONE_DAY }) // stale
    store.record({ ip: '1.2.3.4', at: now - 2 * ONE_DAY }) // stale
    const limiter = createIpRateLimiter(store, 2, ONE_DAY, () => now)
    const next = vi.fn()
    limiter(makeReq('1.2.3.4'), makeRes(), next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('counts a different IP separately', () => {
    const store = createUsageStore(':memory:')
    const now = 10 * ONE_DAY
    store.record({ ip: '1.2.3.4', at: now })
    store.record({ ip: '1.2.3.4', at: now })
    const limiter = createIpRateLimiter(store, 2, ONE_DAY, () => now)
    const next = vi.fn()
    limiter(makeReq('9.9.9.9'), makeRes(), next)
    expect(next).toHaveBeenCalledTimes(1)
  })
})

describe('createGlobalDailyCap', () => {
  it('passes through when cap is null', () => {
    const store = createUsageStore(':memory:')
    const cap = createGlobalDailyCap(store, null, () => 0)
    const next = vi.fn()
    cap(makeReq('1.1.1.1'), makeRes(), next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('blocks once today\'s rows reach the cap', () => {
    const store = createUsageStore(':memory:')
    const now = Date.parse('2026-06-21T12:00:00Z')
    store.record({ ip: 'a', at: now })
    store.record({ ip: 'b', at: now })
    const cap = createGlobalDailyCap(store, 2, () => now)
    const res = makeRes()
    const next = vi.fn()
    cap(makeReq('c'), res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(429)
    expect((res._body as { error: string }).error).toBe('service_busy')
  })

  it('ignores rows from previous days', () => {
    const store = createUsageStore(':memory:')
    const now = Date.parse('2026-06-21T12:00:00Z')
    store.record({ ip: 'a', at: now - ONE_DAY }) // yesterday
    store.record({ ip: 'b', at: now - ONE_DAY })
    const cap = createGlobalDailyCap(store, 2, () => now)
    const next = vi.fn()
    cap(makeReq('c'), makeRes(), next)
    expect(next).toHaveBeenCalledTimes(1)
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
