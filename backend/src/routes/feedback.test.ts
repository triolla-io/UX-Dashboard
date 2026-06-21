import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { createFeedbackRouter } from './feedback'
import { createUsageStore } from '../usage'
import { createIpRateLimiter, createGlobalRateLimiter } from '../middleware/rateLimit'

const MODEL_JSON = JSON.stringify({
  categories: {
    ux: { score: 72, evidence: 'clear top nav' },
    visualDesign: { score: 40, evidence: 'low-contrast series' },
    usability: { score: 55, evidence: 'no empty state visible' },
    dataClarity: { score: 22, evidence: 'no as-of timestamp on any tile' },
  },
  insights: [
    { text: 'No freshness timestamp on any tile', category: 'dataClarity', sentiment: 'issue', priority: 1 },
    { text: 'Clean, scannable card grid', category: 'visualDesign', sentiment: 'positive', priority: 2 },
  ],
})

function okModelResponse(content: string) {
  return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) } as Response
}

// Each test gets a unique IP so the shared rate-limiter instance never blocks other tests.
let ipCounter = 0
function nextIp() {
  ipCounter++
  return `10.0.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`
}

// Build a standalone express app with the factory router for testing
function buildApp() {
  const store = createUsageStore(':memory:')
  const uploadDir = mkdtempSync(path.join(tmpdir(), 'fb-'))
  const ipLimiter = createIpRateLimiter(store, 2, 24 * 60 * 60 * 1000)
  const globalLimiter = createGlobalRateLimiter(30, 60 * 1000)
  const router = createFeedbackRouter({ store, uploadDir })
  const testApp = express()
  testApp.use(express.json({ limit: '8mb' }))
  testApp.use('/api/feedback', globalLimiter, ipLimiter, router)
  return { testApp, store, uploadDir }
}

describe('POST /api/feedback — validation', () => {
  const { testApp } = buildApp()

  it('returns 400 when image is missing', async () => {
    const res = await request(testApp).post('/api/feedback').set('x-forwarded-for', nextIp()).send({ mediaType: 'image/png' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('image is required')
  })

  it('returns 400 when mediaType is invalid', async () => {
    const res = await request(testApp).post('/api/feedback').set('x-forwarded-for', nextIp()).send({ image: 'abc123', mediaType: 'image/gif' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('mediaType must be image/png, image/jpeg, or image/webp')
  })

  it('returns 400 when mediaType is missing', async () => {
    const res = await request(testApp).post('/api/feedback').set('x-forwarded-for', nextIp()).send({ image: 'abc123' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('mediaType must be image/png, image/jpeg, or image/webp')
  })

  it('accepts image/jpeg as a valid mediaType (not a 400)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      { ok: true, json: async () => ({ choices: [{ message: { content: MODEL_JSON } }] }) } as Response
    )
    const res = await request(testApp).post('/api/feedback').set('x-forwarded-for', nextIp()).send({ image: 'abc', mediaType: 'image/jpeg' })
    expect(res.status).not.toBe(400)
    spy.mockRestore()
  })
})

describe('POST /api/feedback — structured audit', () => {
  const { testApp } = buildApp()

  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('returns a validated AuditResult with code-computed overall and verdict', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okModelResponse(MODEL_JSON))
    const res = await request(testApp).post('/api/feedback').set('x-forwarded-for', nextIp()).send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(200)
    expect(res.body.overall).toBe(47)
    expect(res.body.verdict).toBe('Below industry average')
    expect(res.body.categories.dataClarity.score).toBe(22)
    expect(res.body.categories.dataClarity.evidence).toBeTruthy()
    expect(res.body.insights[0].priority).toBe(1)
  })

  it('feeds the DDIA knowledge into the system prompt', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okModelResponse(MODEL_JSON))
    await request(testApp).post('/api/feedback').set('x-forwarded-for', nextIp()).send({ image: 'abc', mediaType: 'image/png' })
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    const system = body.messages.find((m: any) => m.role === 'system')
    const systemText = typeof system.content === 'string'
      ? system.content
      : system.content.map((p: any) => p.text).join('\n')
    expect(systemText).toContain('data-trust')
    expect(systemText.toLowerCase()).toContain('freshness')
  })

  it('parses JSON wrapped in code fences', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okModelResponse('```json\n' + MODEL_JSON + '\n```'))
    const res = await request(testApp).post('/api/feedback').set('x-forwarded-for', nextIp()).send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(200)
    expect(res.body.overall).toBe(47)
  })

  it('retries once on unparseable output, then succeeds', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(okModelResponse('sorry, here is your audit:'))
      .mockResolvedValueOnce(okModelResponse(MODEL_JSON))
    const res = await request(testApp).post('/api/feedback').set('x-forwarded-for', nextIp()).send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(200)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
  })

  it('returns 502 with an error and NO fabricated scores when output stays invalid', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(okModelResponse('nope'))
      .mockResolvedValueOnce(okModelResponse('still nope'))
    const res = await request(testApp).post('/api/feedback').set('x-forwarded-for', nextIp()).send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(502)
    expect(res.body.error).toBeTruthy()
    expect(res.body.overall).toBeUndefined()
    expect(res.body.categories).toBeUndefined()
  })

  it('returns 502 when OpenRouter returns an error response', async () => {
    const errBody = JSON.stringify({ error: { message: 'Rate limited' } })
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      text: async () => errBody,
      json: async () => ({ error: { message: 'Rate limited' } }),
    } as unknown as Response)
    const res = await request(testApp).post('/api/feedback').set('x-forwarded-for', nextIp()).send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(502)
    expect(res.body.error).toBe('Rate limited')
  })

  it('returns 504 on AbortError (timeout)', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    const res = await request(testApp).post('/api/feedback').set('x-forwarded-for', nextIp()).send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(504)
    expect(res.body.error).toBe('The analysis took too long. Please try again.')
  })

  it('truncates context to 200 chars before sending to the model', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okModelResponse(MODEL_JSON))
    await request(testApp).post('/api/feedback').set('x-forwarded-for', nextIp()).send({ image: 'abc', mediaType: 'image/png', context: 'x'.repeat(300) })
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    const user = body.messages.find((m: any) => m.role === 'user')
    const text = user.content.find((b: any) => b.type === 'text').text
    expect(text).toContain('x'.repeat(200))
    expect(text).not.toContain('x'.repeat(201))
  })
})

describe('POST /api/feedback — IP rate limiting', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('returns 429 after 2 requests from the same IP', async () => {
    const { testApp } = buildApp()
    vi.mocked(fetch).mockResolvedValue(okModelResponse(MODEL_JSON))

    await request(testApp).post('/api/feedback').set('x-forwarded-for', '5.5.5.5').send({ image: 'abc', mediaType: 'image/png' })
    await request(testApp).post('/api/feedback').set('x-forwarded-for', '5.5.5.5').send({ image: 'abc', mediaType: 'image/png' })

    const res = await request(testApp).post('/api/feedback').set('x-forwarded-for', '5.5.5.5').send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(429)
    expect(res.body).toEqual({ error: 'usage_limit_reached' })
  })
})

describe('POST /api/feedback — usage logging', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('records a usage row with ip, image path and scores on success', async () => {
    const store = createUsageStore(':memory:')
    const uploadDir = mkdtempSync(path.join(tmpdir(), 'fb-'))
    const router = createFeedbackRouter({ store, uploadDir })
    const app = express()
    app.use(express.json({ limit: '8mb' }))
    app.use('/api/feedback', router)

    vi.mocked(fetch).mockResolvedValue(okModelResponse(MODEL_JSON))
    const res = await request(app)
      .post('/api/feedback')
      .set('x-forwarded-for', '4.4.4.4')
      .send({ image: Buffer.from('img').toString('base64'), mediaType: 'image/png', context: 'sales dash' })
    expect(res.status).toBe(200)
    const rows = store.listRecent(10)
    expect(rows[0].ip).toBe('4.4.4.4')
    expect(rows[0].imagePath).toMatch(/\.png$/)
    expect(rows[0].context).toBe('sales dash')
    expect(rows[0].scores).toHaveProperty('overall')
  })
})
