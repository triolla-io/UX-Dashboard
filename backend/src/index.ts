import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { existsSync } from 'fs'
import feedbackRouter from './routes/feedback'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json({ limit: '20mb' }))

app.use('/api/feedback', feedbackRouter)

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
