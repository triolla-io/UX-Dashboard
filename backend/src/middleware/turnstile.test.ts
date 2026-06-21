import { describe, it, expect, vi, afterEach } from 'vitest'
import { createTurnstile } from './turnstile'
import type { Request, Response } from 'express'

function makeReq(body: unknown): Request {
  return { body, socket: { remoteAddress: '1.1.1.1' }, headers: {} } as unknown as Request
}
function makeRes() {
  const res = {
    _status: 200, _body: null as unknown,
    status(code: number) { this._status = code; return this },
    json(body: unknown) { this._body = body; return this },
  }
  return res as unknown as Response & { _status: number; _body: unknown }
}

afterEach(() => vi.unstubAllGlobals())

describe('turnstile middleware', () => {
  it('passes through when no secret is configured', async () => {
    const mw = createTurnstile(undefined)
    const next = vi.fn()
    await mw(makeReq({}), makeRes(), next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('rejects with 403 when the token is missing', async () => {
    const mw = createTurnstile('secret')
    const next = vi.fn()
    const res = makeRes()
    await mw(makeReq({}), res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect((res._body as { error: string }).error).toBe('verification_failed')
  })

  it('passes when Cloudflare returns success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }))
    const mw = createTurnstile('secret')
    const next = vi.fn()
    await mw(makeReq({ turnstileToken: 'good' }), makeRes(), next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('rejects with 403 when Cloudflare returns failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) }))
    const mw = createTurnstile('secret')
    const next = vi.fn()
    const res = makeRes()
    await mw(makeReq({ turnstileToken: 'bad' }), res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
  })

  it('rejects with 403 when the verification request throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const mw = createTurnstile('secret')
    const next = vi.fn()
    const res = makeRes()
    await mw(makeReq({ turnstileToken: 'whatever' }), res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect((res._body as { error: string }).error).toBe('verification_failed')
  })
})
