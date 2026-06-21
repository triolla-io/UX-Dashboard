import type Database from 'better-sqlite3'
import type { Request, Response, NextFunction } from 'express'
import { clientIp } from '../util/clientIp'

export interface BlocklistEntry {
  ip: string
  reason: string | null
  at: number
}

export function createBlocklist(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS blocklist (
      ip TEXT PRIMARY KEY,
      reason TEXT,
      at INTEGER NOT NULL
    );
  `)
  const getStmt = db.prepare('SELECT ip FROM blocklist WHERE ip = ?')
  const addStmt = db.prepare(
    'INSERT INTO blocklist (ip, reason, at) VALUES (?, ?, ?) ON CONFLICT(ip) DO UPDATE SET reason = excluded.reason'
  )
  const removeStmt = db.prepare('DELETE FROM blocklist WHERE ip = ?')
  const listStmt = db.prepare('SELECT ip, reason, at FROM blocklist ORDER BY at DESC')

  return {
    middleware(req: Request, res: Response, next: NextFunction) {
      if (getStmt.get(clientIp(req))) {
        return res.status(403).json({ error: 'blocked' })
      }
      next()
    },
    add(ip: string, reason?: string) {
      addStmt.run(ip, reason ?? null, Date.now())
    },
    remove(ip: string) {
      removeStmt.run(ip)
    },
    list(): BlocklistEntry[] {
      return listStmt.all() as BlocklistEntry[]
    },
  }
}
