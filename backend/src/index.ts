import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { existsSync, createReadStream, mkdirSync } from 'fs'
import { createFeedbackRouter } from './routes/feedback'
import { createIpRateLimiter, createGlobalRateLimiter, createGlobalDailyCap } from './middleware/rateLimit'
import { createTurnstile } from './middleware/turnstile'
import { createBlocklist } from './middleware/blocklist'
import { createUsageStore } from './usage'
import { runImageCleanup } from './imageCleanup'
import Database from 'better-sqlite3'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '8mb' }))

const usageDbPath =
  process.env.USAGE_DB_PATH ?? (process.env.NODE_ENV === 'test' ? ':memory:' : 'data/usage.db')
const usage = createUsageStore(usageDbPath)

const uploadDir = process.env.IMAGE_UPLOAD_DIR ?? 'data/uploads'
const MAX_FREE_USES = Number(process.env.MAX_FREE_USES ?? 2)
const GLOBAL_DAILY_CAP = process.env.GLOBAL_DAILY_CAP ? Number(process.env.GLOBAL_DAILY_CAP) : null
const RETENTION_DAYS = Number(process.env.IMAGE_RETENTION_DAYS ?? 30)

// Blocklist shares the usage DB file by default (separate table). Defaulting to
// usageDbPath — not a hardcoded relative path — guarantees it lands in the same
// directory the usage store already created, so it can't fail to open when
// USAGE_DB_PATH points at a mounted volume. BLOCKLIST_DB_PATH can still override.
const blocklistDbPath =
  process.env.NODE_ENV === 'test' ? ':memory:' : (process.env.BLOCKLIST_DB_PATH ?? usageDbPath)
if (blocklistDbPath !== ':memory:') {
  mkdirSync(path.dirname(path.resolve(blocklistDbPath)), { recursive: true })
}
const blocklistDb = new Database(blocklistDbPath)
const blocklist = createBlocklist(blocklistDb)

const globalLimiter = createGlobalRateLimiter(30, 60 * 1000)
const turnstile = createTurnstile(process.env.TURNSTILE_SECRET_KEY)
const ipLimiter = createIpRateLimiter(usage, MAX_FREE_USES, 24 * 60 * 60 * 1000)
const globalDailyCap = createGlobalDailyCap(usage, GLOBAL_DAILY_CAP)

// Order: cheap checks before the expensive model call.
app.use(
  '/api/feedback',
  globalLimiter,
  turnstile,
  blocklist.middleware,
  ipLimiter,
  globalDailyCap,
  createFeedbackRouter({ store: usage, uploadDir })
)

function checkToken(req: Request): boolean {
  const required = process.env.STATS_TOKEN
  if (!required) return true
  const provided = (req.headers['x-stats-token'] as string | undefined) ?? (req.query.token as string | undefined)
  return provided === required
}

// Admin endpoints serve personal data (raw IPs + user screenshots), so they
// FAIL CLOSED: when STATS_TOKEN is unset, deny access rather than expose it.
// (checkToken above stays open-when-unset for the non-sensitive /api/stats.)
function requireToken(req: Request): boolean {
  const required = process.env.STATS_TOKEN
  if (!required) return false
  const provided = (req.headers['x-stats-token'] as string | undefined) ?? (req.query.token as string | undefined)
  return provided === required
}

app.get('/api/stats', (req: Request, res: Response) => {
  if (!checkToken(req)) return res.status(401).json({ error: 'unauthorized' })
  res.json(usage.stats(Date.now()))
})

app.get('/api/admin/log', (req: Request, res: Response) => {
  if (!requireToken(req)) return res.status(401).json({ error: 'unauthorized' })
  const limit = Math.min(Number(req.query.limit) || 200, 1000)
  res.json({ rows: usage.listRecent(limit) })
})

app.get('/api/admin/image/:id', (req: Request, res: Response) => {
  if (!requireToken(req)) return res.status(401).json({ error: 'unauthorized' })
  const row = usage.getById(Number(req.params.id))
  if (!row || !row.imagePath || !existsSync(row.imagePath)) {
    return res.status(404).json({ error: 'not_found' })
  }
  res.type(row.mediaType ?? 'application/octet-stream')
  createReadStream(row.imagePath).pipe(res)
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ error: 'Something went wrong. Please try again later.' })
})

const distPath = path.resolve(__dirname, '../../frontend/dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

export default app

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001
  // Image retention sweep: run on boot and daily.
  runImageCleanup(usage, RETENTION_DAYS, Date.now())
  setInterval(() => runImageCleanup(usage, RETENTION_DAYS, Date.now()), 24 * 60 * 60 * 1000).unref?.()
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`)
  })
}
