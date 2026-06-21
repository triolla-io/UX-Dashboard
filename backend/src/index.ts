import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { createHash } from 'crypto'
import { existsSync } from 'fs'
import feedbackRouter from './routes/feedback'
import { createIpRateLimiter, createGlobalRateLimiter } from './middleware/rateLimit'
import { createUsageStore } from './usage'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json({ limit: '8mb' }))

// 2 uses per IP per 24h; 30 requests per minute globally (protects OpenRouter key)
const ipLimiter = createIpRateLimiter(2, 24 * 60 * 60 * 1000)
const globalLimiter = createGlobalRateLimiter(30, 60 * 1000)

// Persistent usage tracking. In-memory under test; a file (mount a persistent
// volume at this path in production) otherwise.
const usageDbPath =
  process.env.USAGE_DB_PATH ?? (process.env.NODE_ENV === 'test' ? ':memory:' : 'data/usage.db')
const usage = createUsageStore(usageDbPath)

function clientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ??
    req.socket.remoteAddress ??
    'unknown'
  )
}

// Hash the IP so we count unique visitors without storing raw addresses (PII).
function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

// Record a usage row only for successful audits (HTTP 200).
function recordOnSuccess(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    if (res.statusCode === 200) usage.record(hashIp(clientIp(req)), Date.now())
  })
  next()
}

app.use('/api/feedback', globalLimiter, ipLimiter, recordOnSuccess, feedbackRouter)

// Usage stats. Protected by STATS_TOKEN when set (?token= or x-stats-token header).
app.get('/api/stats', (req: Request, res: Response) => {
  const required = process.env.STATS_TOKEN
  if (required) {
    const provided = (req.headers['x-stats-token'] as string | undefined) ?? (req.query.token as string | undefined)
    if (provided !== required) return res.status(401).json({ error: 'unauthorized' })
  }
  res.json(usage.stats(Date.now()))
})

// Catch-all JSON error handler — prevents Express from leaking HTML error pages
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ error: 'Something went wrong. Please try again later.' })
})

// Serve frontend in production
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
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`)
  })
}
