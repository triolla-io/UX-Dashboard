// Daily backup of the usage SQLite DB to the persistent volume.
// Run via the Coolify scheduled task "usage-db-daily-backup" (node this file).
// Uses SQLite's online backup API for a consistent copy even while the app
// is writing (WAL mode). Keeps the newest KEEP daily snapshots.
//
// On-volume only: protects against DB corruption / a bad deploy, NOT a full
// server/disk loss. For that, add an off-site copy of /data/backups.

const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const DB_PATH = process.env.USAGE_DB_PATH || '/data/usage.db'
const BACKUP_DIR = process.env.BACKUP_DIR || '/data/backups'
const KEEP = Number(process.env.BACKUP_KEEP || 7)

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('backup SKIP: source DB not found at', DB_PATH)
    process.exit(1)
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true })

  const day = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
  const dest = path.join(BACKUP_DIR, `usage-${day}.db`)

  const db = new Database(DB_PATH, { readonly: true })
  await db.backup(dest)
  db.close()
  console.log('backup OK ->', dest)

  // Prune: keep the newest KEEP daily snapshots.
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => /^usage-\d{4}-\d{2}-\d{2}\.db$/.test(f))
    .sort()
    .reverse()
  for (const f of files.slice(KEEP)) {
    fs.unlinkSync(path.join(BACKUP_DIR, f))
    console.log('pruned', f)
  }
}

main().catch((e) => {
  console.error('backup FAIL', e)
  process.exit(1)
})
