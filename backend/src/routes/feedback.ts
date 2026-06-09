import { Router, Request, Response } from 'express'
import { readFileSync } from 'fs'
import path from 'path'
import { buildAuditResult, parseAuditJson } from '../audit'

const router = Router()

const ALLOWED_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const readSkill = (rel: string) =>
  readFileSync(path.resolve(__dirname, '../skills', rel), 'utf-8')

// DDIA operational knowledge (de-biased: the old visual-first dashboard.md is no longer fed)
// + the authored rubric/schema/grounding prompt.
const SYSTEM_PROMPT = [
  readSkill('reference/cheatsheet.md'),
  readSkill('reference/patterns.md'),
  readSkill('prompts/critique.md'),
].join('\n\n---\n\n')

class OpenRouterError extends Error {}

const FALLBACK_MODEL = 'anthropic/claude-sonnet-4-6'

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
    const errData = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new OpenRouterError(errData.error?.message || 'OpenRouter error')
  }

  const data = (await response.json()) as any
  const content: string | undefined = data.choices?.[0]?.message?.content
  if (!content) throw new OpenRouterError('No content returned from model')
  return content
}

router.post('/', async (req: Request, res: Response) => {
  const { image, mediaType, context } = req.body

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'image is required' })
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
        lastParseError = new Error('model refused to return JSON')
        continue
      }
      try {
        const audit = buildAuditResult(parseAuditJson(content))
        clearTimeout(timeoutId)
        return res.json(audit)
      } catch (e) {
        lastParseError = e
      }
    }
    clearTimeout(timeoutId)
    console.error('feedback: model output failed validation', lastParseError)
    return res.status(502).json({ error: 'The analysis could not be completed. Please try again.' })
  } catch (e) {
    clearTimeout(timeoutId)
    if (e instanceof Error && e.name === 'AbortError') {
      return res.status(504).json({ error: 'The analysis took too long. Please try again.' })
    }
    if (e instanceof OpenRouterError) {
      return res.status(502).json({ error: e.message })
    }
    return res.status(500).json({ error: 'Something went wrong. Please try again later.' })
  }
})

export default router
