import { Router, Request, Response } from 'express'
import { readFileSync } from 'fs'
import path from 'path'
import { buildAuditResult, parseAuditJson } from '../audit'

const router = Router()

const ALLOWED_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const readSkill = (rel: string) =>
  readFileSync(path.resolve(__dirname, '../skills', rel), 'utf-8')

const SYSTEM_PROMPT = [
  readSkill('reference/cheatsheet.md'),
  readSkill('reference/patterns.md'),
  readSkill('prompts/critique.md'),
].join('\n\n---\n\n')

class OpenRouterError extends Error {}

const FALLBACK_MODEL = 'anthropic/claude-sonnet-4-6'

// Strip <think>...</think> blocks that Gemini 2.5 Flash emits before the JSON
function stripThinking(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

function looksLikeRefusal(content: string): boolean {
  const t = content.trimStart()
  return !t.startsWith('{') && !t.startsWith('`')
}

async function callModel(image: string, mediaType: string, contextText: string, signal: AbortSignal, modelOverride?: string): Promise<string> {
  const userText = `Analyze this dashboard screenshot and return the audit JSON.${contextText ? ` Context: ${contextText}` : ''}`
  const model = modelOverride ?? (process.env.OPENROUTER_MODEL || FALLBACK_MODEL)
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 3000,
      messages: [
        {
          role: 'system',
          content: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${image}` } },
            { type: 'text', text: userText },
          ],
        },
      ],
    }),
    signal,
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    console.error(`OpenRouter ${response.status}:`, errText.slice(0, 300))
    let errMsg = 'OpenRouter error'
    try { errMsg = (JSON.parse(errText) as any).error?.message || errMsg } catch {}
    throw new OpenRouterError(errMsg)
  }

  const data = (await response.json()) as any
  const raw: string | undefined = data.choices?.[0]?.message?.content
  if (!raw) throw new OpenRouterError('No content returned from model')
  return stripThinking(raw)
}

router.post('/', async (req: Request, res: Response) => {
  // Wrap everything — in Node 22, any unhandled async throw crashes the process
  try {
    const body = req.body ?? {}
    const { image, mediaType, context } = body

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'image is required' })
    }
    // base64 of a ~5MB image is ~6.7MB; reject anything larger
    if (image.length > 7_000_000) {
      return res.status(413).json({ error: 'image too large' })
    }
    if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
      return res.status(400).json({ error: 'mediaType must be image/png, image/jpeg, or image/webp' })
    }

    const contextText = context ? String(context).slice(0, 200) : ''
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    try {
      let lastParseError: unknown
      const primaryModel = process.env.OPENROUTER_MODEL || FALLBACK_MODEL
      const models = primaryModel !== FALLBACK_MODEL ? [primaryModel, FALLBACK_MODEL] : [primaryModel, primaryModel]
      for (let attempt = 0; attempt < 2; attempt++) {
        const content = await callModel(image, mediaType, contextText, controller.signal, models[attempt])
        if (looksLikeRefusal(content)) {
          console.error(`feedback: attempt ${attempt + 1} looks like refusal:`, content.slice(0, 200))
          lastParseError = new Error('model refused to return JSON')
          continue
        }
        try {
          const audit = buildAuditResult(parseAuditJson(content))
          clearTimeout(timeoutId)
          return res.json(audit)
        } catch (e) {
          console.error(`feedback: attempt ${attempt + 1} parse/validation failed:`, (e as Error).message, content.slice(0, 200))
          lastParseError = e
        }
      }
      clearTimeout(timeoutId)
      console.error('feedback: all attempts failed, lastError:', lastParseError)
      return res.status(502).json({ error: 'The analysis could not be completed. Please try again.' })
    } catch (e) {
      clearTimeout(timeoutId)
      if (e instanceof Error && e.name === 'AbortError') {
        return res.status(504).json({ error: 'The analysis took too long. Please try again.' })
      }
      if (e instanceof OpenRouterError) {
        console.error('feedback: OpenRouterError:', (e as Error).message)
        return res.status(502).json({ error: (e as Error).message })
      }
      console.error('feedback: unexpected error:', e)
      return res.status(500).json({ error: 'Something went wrong. Please try again later.' })
    }
  } catch (e) {
    // Safety net — ensures Node process never crashes from this route
    console.error('feedback: top-level catch:', e)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Something went wrong. Please try again later.' })
    }
  }
})

export default router
