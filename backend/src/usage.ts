import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import path from 'path'

export interface UsageStats {
  totalRuns: number
  uniqueUsers: number
  runsLast24h: number
  perDay: Array<{ date: string; runs: number }>
}

export interface UsageEntry {
  ip: string
  at: number
  imagePath?: string | null
  mediaType?: string | null
  context?: string | null
  scores?: unknown
}

export interface UsageRow {
  id: number
  ip: string
  at: number
  imagePath: string | null
  mediaType: string | null
  context: string | null
  scores: unknown
}

export interface UsageStore {
  record(entry: UsageEntry): void
  countByIpSince(ip: string, since: number): number
  countSince(since: number): number
  listRecent(limit: number): UsageRow[]
  getById(id: number): UsageRow | undefined
  stats(now: number): UsageStats
  expireImages(cutoff: number): string[]
  close(): void
}

const DAY = 24 * 60 * 60 * 1000

// YYYY-MM-DD in UTC for a given epoch-ms timestamp
function dayKey(at: number): string {
  return new Date(at).toISOString().slice(0, 10)
}

interface DbRow {
  id: number
  ip: string
  at: number
  image_path: string | null
  media_type: string | null
  context: string | null
  scores_json: string | null
}

function toRow(r: DbRow): UsageRow {
  return {
    id: r.id,
    ip: r.ip,
    at: r.at,
    imagePath: r.image_path,
    mediaType: r.media_type,
    context: r.context,
    scores: r.scores_json ? JSON.parse(r.scores_json) : null,
  }
}

export function createUsageStore(dbPath: string): UsageStore {
  if (dbPath !== ':memory:') {
    mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true })
  }
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  // Migration: if the usage table exists with the OLD schema (ip_hash column, no ip column),
  // rename it and re-create with the new schema, preserving history best-effort.
  interface TableInfoRow { name: string }
  const tableInfo = db.prepare("PRAGMA table_info(usage)").all() as TableInfoRow[]
  if (tableInfo.length > 0) {
    const hasIp = tableInfo.some((col) => col.name === 'ip')
    if (!hasIp) {
      // Old schema detected — migrate
      db.exec('ALTER TABLE usage RENAME TO usage_old')
      db.exec(`
        CREATE TABLE IF NOT EXISTS usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ip TEXT NOT NULL,
          at INTEGER NOT NULL,
          image_path TEXT,
          media_type TEXT,
          context TEXT,
          scores_json TEXT
        )
      `)
      try {
        db.exec('INSERT INTO usage (ip, at) SELECT ip_hash, at FROM usage_old')
      } catch (e) {
        console.warn('usage migration: could not copy old rows:', (e as Error).message)
      }
      db.exec('DROP TABLE usage_old')
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      at INTEGER NOT NULL,
      image_path TEXT,
      media_type TEXT,
      context TEXT,
      scores_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_usage_at ON usage(at);
    CREATE INDEX IF NOT EXISTS idx_usage_ip_at ON usage(ip, at);
  `)

  const insert = db.prepare(
    'INSERT INTO usage (ip, at, image_path, media_type, context, scores_json) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const totalStmt = db.prepare('SELECT COUNT(*) AS c FROM usage')
  const uniqueStmt = db.prepare('SELECT COUNT(DISTINCT ip) AS c FROM usage')
  const sinceStmt = db.prepare('SELECT COUNT(*) AS c FROM usage WHERE at >= ?')
  const ipSinceStmt = db.prepare('SELECT COUNT(*) AS c FROM usage WHERE ip = ? AND at >= ?')
  const recentStmt = db.prepare('SELECT * FROM usage ORDER BY at DESC, id DESC LIMIT ?')
  const byIdStmt = db.prepare('SELECT * FROM usage WHERE id = ?')
  const allAtStmt = db.prepare('SELECT at FROM usage')
  const expiredSelectStmt = db.prepare(
    'SELECT image_path FROM usage WHERE image_path IS NOT NULL AND at < ?'
  )
  const expiredUpdateStmt = db.prepare(
    'UPDATE usage SET image_path = NULL WHERE image_path IS NOT NULL AND at < ?'
  )

  return {
    record(entry: UsageEntry) {
      insert.run(
        entry.ip,
        entry.at,
        entry.imagePath ?? null,
        entry.mediaType ?? null,
        entry.context ?? null,
        entry.scores === undefined ? null : JSON.stringify(entry.scores)
      )
    },
    countByIpSince(ip: string, since: number): number {
      return (ipSinceStmt.get(ip, since) as { c: number }).c
    },
    countSince(since: number): number {
      return (sinceStmt.get(since) as { c: number }).c
    },
    listRecent(limit: number): UsageRow[] {
      return (recentStmt.all(limit) as DbRow[]).map(toRow)
    },
    getById(id: number): UsageRow | undefined {
      const row = byIdStmt.get(id) as DbRow | undefined
      return row ? toRow(row) : undefined
    },
    stats(now: number): UsageStats {
      const totalRuns = (totalStmt.get() as { c: number }).c
      const uniqueUsers = (uniqueStmt.get() as { c: number }).c
      const runsLast24h = (sinceStmt.get(now - DAY) as { c: number }).c
      const counts = new Map<string, number>()
      for (const row of allAtStmt.all() as Array<{ at: number }>) {
        const key = dayKey(row.at)
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      const perDay = [...counts.entries()]
        .map(([date, runs]) => ({ date, runs }))
        .sort((a, b) => (a.date < b.date ? 1 : -1))
      return { totalRuns, uniqueUsers, runsLast24h, perDay }
    },
    expireImages(cutoff: number): string[] {
      const paths = (expiredSelectStmt.all(cutoff) as Array<{ image_path: string }>).map(
        (r) => r.image_path
      )
      expiredUpdateStmt.run(cutoff)
      return paths
    },
    close() {
      db.close()
    },
  }
}
