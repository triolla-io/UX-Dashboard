import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import app from '../index'

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

describe('POST /api/feedback — validation', () => {
  it('returns 400 when image is missing', async () => {
    const res = await request(app).post('/api/feedback').send({ mediaType: 'image/png' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('image is required')
  })

  it('returns 400 when mediaType is invalid', async () => {
    const res = await request(app).post('/api/feedback').send({ image: 'abc123', mediaType: 'image/gif' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('mediaType must be image/png, image/jpeg, or image/webp')
  })

  it('returns 400 when mediaType is missing', async () => {
    const res = await request(app).post('/api/feedback').send({ image: 'abc123' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('mediaType must be image/png, image/jpeg, or image/webp')
  })

  it('accepts image/jpeg as a valid mediaType (not a 400)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      { ok: true, json: async () => ({ choices: [{ message: { content: MODEL_JSON } }] }) } as Response
    )
    const res = await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/jpeg' })
    expect(res.status).not.toBe(400)
    spy.mockRestore()
  })
})

describe('POST /api/feedback — structured audit', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('returns a validated AuditResult with code-computed overall and verdict', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okModelResponse(MODEL_JSON))
    const res = await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(200)
    expect(res.body.overall).toBe(47)
    expect(res.body.verdict).toBe('Below industry average')
    expect(res.body.categories.dataClarity.score).toBe(22)
    expect(res.body.categories.dataClarity.evidence).toBeTruthy()
    expect(res.body.insights[0].priority).toBe(1)
  })

  it('feeds the DDIA knowledge into the system prompt', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okModelResponse(MODEL_JSON))
    await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png' })
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
    const res = await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(200)
    expect(res.body.overall).toBe(47)
  })

  it('retries once on unparseable output, then succeeds', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(okModelResponse('sorry, here is your audit:'))
      .mockResolvedValueOnce(okModelResponse(MODEL_JSON))
    const res = await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(200)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
  })

  it('returns 502 with an error and NO fabricated scores when output stays invalid', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(okModelResponse('nope'))
      .mockResolvedValueOnce(okModelResponse('still nope'))
    const res = await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(502)
    expect(res.body.error).toBeTruthy()
    expect(res.body.overall).toBeUndefined()
    expect(res.body.categories).toBeUndefined()
  })

  it('returns 502 when OpenRouter returns an error response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Rate limited' } }),
    } as Response)
    const res = await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(502)
    expect(res.body.error).toBe('Rate limited')
  })

  it('returns 504 on AbortError (timeout)', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    const res = await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(504)
    expect(res.body.error).toBe('The analysis took too long. Please try again.')
  })

  it('truncates context to 200 chars before sending to the model', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okModelResponse(MODEL_JSON))
    await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png', context: 'x'.repeat(300) })
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    const user = body.messages.find((m: any) => m.role === 'user')
    const text = user.content.find((b: any) => b.type === 'text').text
    expect(text).toContain('x'.repeat(200))
    expect(text).not.toContain('x'.repeat(201))
  })
})
