import { describe, it, expect, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createBlocklist } from './blocklist'
import type { Request, Response } from 'express'

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

describe('blocklist', () => {
  it('allows a non-listed IP', () => {
    const bl = createBlocklist(new Database(':memory:'))
    const next = vi.fn()
    bl.middleware(makeReq('1.1.1.1'), makeRes(), next)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('blocks a listed IP with 403', () => {
    const bl = createBlocklist(new Database(':memory:'))
    bl.add('2.2.2.2', 'abuse')
    const next = vi.fn()
    const res = makeRes()
    bl.middleware(makeReq('2.2.2.2'), res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect((res._body as { error: string }).error).toBe('blocked')
  })

  it('remove un-blocks; list reflects entries', () => {
    const bl = createBlocklist(new Database(':memory:'))
    bl.add('3.3.3.3', 'spam')
    expect(bl.list().map((e) => e.ip)).toContain('3.3.3.3')
    bl.remove('3.3.3.3')
    expect(bl.list()).toHaveLength(0)
    const next = vi.fn()
    bl.middleware(makeReq('3.3.3.3'), makeRes(), next)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
