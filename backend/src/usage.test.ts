import { describe, test, expect } from 'vitest'
import { mkdtempSync, rmdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import Database from 'better-sqlite3'
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

  test('getById returns the correct row or undefined', () => {
    const s = createUsageStore(':memory:')
    rec(s, 'ip-a', 1000)
    rec(s, 'ip-b', 2000)
    const rows = s.listRecent(10)
    const row = s.getById(rows[0].id)
    expect(row).toBeDefined()
    expect(row!.ip).toBe(rows[0].ip)
    expect(row!.at).toBe(rows[0].at)
    expect(s.getById(99999)).toBeUndefined()
  })

  test('expireImages nulls and returns paths older than cutoff', () => {
    const s = createUsageStore(':memory:')
    rec(s, 'ip-a', 1000, { imagePath: '/u/old.png' })
    rec(s, 'ip-b', 5000, { imagePath: '/u/new.png' })
    const cleared = s.expireImages(3000)
    expect(cleared).toEqual(['/u/old.png'])
    // calling again clears nothing (already nulled)
    expect(s.expireImages(3000)).toEqual([])
    const rows = s.listRecent(10)
    expect(rows.find((r) => r.at === 1000)!.imagePath).toBeNull()
    expect(rows.find((r) => r.at === 5000)!.imagePath).toBe('/u/new.png')
  })
})

describe('usage store migration', () => {
  test('migrates old-schema (ip_hash) table and preserves rows', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'usage-migration-'))
    const dbFile = join(tmpDir, 'usage.db')
    try {
      // Set up old-schema DB
      const oldDb = new Database(dbFile)
      oldDb.exec(`
        CREATE TABLE usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ip_hash TEXT NOT NULL,
          at INTEGER NOT NULL
        )
      `)
      oldDb.prepare("INSERT INTO usage (ip_hash, at) VALUES (?, ?)").run('abc123', 1000)
      oldDb.close()

      // Open via createUsageStore — should migrate transparently
      const s = createUsageStore(dbFile)

      // (a) new record does not throw
      expect(() => s.record({ ip: '1.2.3.4', at: 2000 })).not.toThrow()

      // (b) totalRuns includes old row + new row
      expect(s.stats(3000).totalRuns).toBe(2)

      // (c) old row migrated into ip column
      expect(s.countByIpSince('abc123', 0)).toBe(1)

      s.close()
    } finally {
      try { rmSync(dbFile) } catch {}
      try { rmSync(dbFile + '-wal') } catch {}
      try { rmSync(dbFile + '-shm') } catch {}
      try { rmdirSync(tmpDir) } catch {}
    }
  })
})
