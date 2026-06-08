import { Router, Request, Response } from 'express'
import { readFileSync } from 'fs'
import path from 'path'

const router = Router()

const ALLOWED_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp']

router.post('/', async (req: Request, res: Response) => {
  const { image, mediaType, context } = req.body

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'image is required' })
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return res.status(400).json({ error: 'mediaType must be image/png, image/jpeg, or image/webp' })
  }

  let skillContent: string
  try {
    skillContent = readFileSync(
      path.resolve(__dirname, '../skills/dashboard.md'),
      'utf-8'
    )
  } catch {
    return res.status(500).json({ error: 'Skill file not found' })
  }

  const contextText = context ? String(context).slice(0, 200) : ''
  const userText = `Please analyze this dashboard.${contextText ? ` Context: ${contextText}` : ''}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-6',
        system: skillContent,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mediaType};base64,${image}` },
              },
              { type: 'text', text: userText },
            ],
          },
        ],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      return res
        .status(502)
        .json({ error: (errData as any).error?.message || 'OpenRouter error' })
    }

    const data = (await response.json()) as any
    const feedback: string = data.choices?.[0]?.message?.content

    if (!feedback) {
      return res.status(502).json({ error: 'No feedback returned from model' })
    }

    return res.json({ feedback })
  } catch (e: any) {
    clearTimeout(timeoutId)
    if (e.name === 'AbortError') {
      return res
        .status(504)
        .json({ error: 'The analysis took too long. Please try again.' })
    }
    return res
      .status(500)
      .json({ error: 'Something went wrong. Please try again later.' })
  }
})

export default router
