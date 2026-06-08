import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import feedbackRouter from './routes/feedback'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json({ limit: '20mb' }))

app.use('/api/feedback', feedbackRouter)

export default app

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`)
  })
}
