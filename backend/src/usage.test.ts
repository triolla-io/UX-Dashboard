import { describe, test, expect } from 'vitest'
import { createUsageStore } from './usage'

const DAY = 24 * 60 * 60 * 1000

function rec(store: ReturnType<typeof createUsageStore>, ip: string, at: number, extra: Record<string, unknown> = {}) {
  store.record({ ip, at, ...extra })
}

describe('usage store', () => {
  test('counts total runs and unique IPs', () => {
    const s = createUsageStore(':memory:')
    rec(s, 'ip-a', 1000); rec(s, 'ip-a', 2000); rec(s, 'ip-b', 3000)
    expect(s.stats(4000).totalRuns).toBe(3)
    expect(s.stats(4000).uniqueUsers).toBe(2)
  })

  test('countByIpSince counts only that IP within the window', () => {
    const s = createUsageStore(':memory:')
    const now = 10 * DAY
    rec(s, 'ip-a', now - 2 * DAY) // outside 24h
    rec(s, 'ip-a', now - 1000)    // inside
    rec(s, 'ip-a', now - 500)     // inside
    rec(s, 'ip-b', now - 100)     // other ip
    expect(s.countByIpSince('ip-a', now - DAY)).toBe(2)
  })

  test('countSince counts all rows in the window', () => {
    const s = createUsageStore(':memory:')
    const now = 10 * DAY
    rec(s, 'ip-a', now - 2 * DAY)
    rec(s, 'ip-a', now - 1000)
    rec(s, 'ip-b', now - 500)
    expect(s.countSince(now - DAY)).toBe(2)
  })

  test('listRecent returns rows newest-first with all fields', () => {
    const s = createUsageStore(':memory:')
    rec(s, 'ip-a', 1000, { imagePath: '/u/a.png', mediaType: 'image/png', context: 'hi', scores: { overall: 50 } })
    rec(s, 'ip-b', 2000, { imagePath: '/u/b.png', mediaType: 'image/jpeg' })
    const rows = s.listRecent(10)
    expect(rows[0].ip).toBe('ip-b')
    expect(rows[0].at).toBe(2000)
    expect(rows[1].imagePath).toBe('/u/a.png')
    expect(rows[1].scores).toEqual({ overall: 50 })
    expect(rows[1].context).toBe('hi')
  })

  test('listRecent respects the limit', () => {
    const s = createUsageStore(':memory:')
    for (let i = 0; i < 5; i++) rec(s, 'ip', 1000 + i)
    expect(s.listRecent(3)).toHaveLength(3)
  })

  test('groups runs per day, most recent first', () => {
    const s = createUsageStore(':memory:')
    const now = 10 * DAY
    rec(s, 'ip-a', now); rec(s, 'ip-b', now); rec(s, 'ip-a', now - DAY)
    const perDay = s.stats(now).perDay
    expect(perDay[0]).toEqual({ date: '1970-01-11', runs: 2 })
    expect(perDay[1]).toEqual({ date: '1970-01-10', runs: 1 })
  })
})
