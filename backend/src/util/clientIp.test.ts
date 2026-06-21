import { describe, it, expect } from 'vitest'
import type { Request } from 'express'
import { clientIp } from './clientIp'

describe('clientIp', () => {
  it('prefers the first x-forwarded-for entry', () => {
    const req = { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }, socket: { remoteAddress: '9.9.9.9' } } as unknown as Request
    expect(clientIp(req)).toBe('1.2.3.4')
  })

  it('falls back to socket.remoteAddress', () => {
    const req = { headers: {}, socket: { remoteAddress: '9.9.9.9' } } as unknown as Request
    expect(clientIp(req)).toBe('9.9.9.9')
  })

  it('falls back to "unknown" when nothing is available', () => {
    const req = { headers: {}, socket: {} } as unknown as Request
    expect(clientIp(req)).toBe('unknown')
  })
})
