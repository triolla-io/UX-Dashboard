import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import path from 'path'

export interface UsageStats {
  totalRuns: number
  uniqueUsers: number
  runsLast24h: number
  perDay: Array<{ date: string; runs: number }>
}

export interface UsageStore {
  record(ipHash: string, at: number): void
  stats(now: number): UsageStats
  close(): void
}

const DAY = 24 * 60 * 60 * 1000

// YYYY-MM-DD in UTC for a given epoch-ms timestamp
function dayKey(at: number): string {
  return new Date(at).toISOString().slice(0, 10)
}

export function createUsageStore(dbPath: string): UsageStore {
  // better-sqlite3 won't create parent dirs; ensure they exist for file paths.
  if (dbPath !== ':memory:') {
    mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true })
  }
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_hash TEXT NOT NULL,
      at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_usage_at ON usage(at);
  `)

  const insert = db.prepare('INSERT INTO usage (ip_hash, at) VALUES (?, ?)')
  const totalStmt = db.prepare('SELECT COUNT(*) AS c FROM usage')
  const uniqueStmt = db.prepare('SELECT COUNT(DISTINCT ip_hash) AS c FROM usage')
  const sinceStmt = db.prepare('SELECT COUNT(*) AS c FROM usage WHERE at >= ?')
  const perDayStmt = db.prepare('SELECT at FROM usage')

  return {
    record(ipHash: string, at: number) {
      insert.run(ipHash, at)
    },
    stats(now: number): UsageStats {
      const totalRuns = (totalStmt.get() as { c: number }).c
      const uniqueUsers = (uniqueStmt.get() as { c: number }).c
      const runsLast24h = (sinceStmt.get(now - DAY) as { c: number }).c

      const counts = new Map<string, number>()
      for (const row of perDayStmt.all() as Array<{ at: number }>) {
        const key = dayKey(row.at)
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      const perDay = [...counts.entries()]
        .map(([date, runs]) => ({ date, runs }))
        .sort((a, b) => (a.date < b.date ? 1 : -1))

      return { totalRuns, uniqueUsers, runsLast24h, perDay }
    },
    close() {
      db.close()
    },
  }
}
