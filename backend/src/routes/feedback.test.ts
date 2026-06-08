import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import app from '../index'

describe('POST /api/feedback — validation', () => {
  it('returns 400 when image is missing', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ mediaType: 'image/png' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('image is required')
  })

  it('returns 400 when mediaType is invalid', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/gif' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('mediaType must be image/png, image/jpeg, or image/webp')
  })

  it('returns 400 when mediaType is missing', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('mediaType must be image/png, image/jpeg, or image/webp')
  })

  it('accepts image/jpeg as valid mediaType', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/jpeg' })
    expect(res.status).not.toBe(400)
  })
})

describe('POST /api/feedback — OpenRouter integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns feedback text on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Great layout!' } }],
      }),
    } as Response)

    const res = await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/png', context: 'fintech SaaS' })

    expect(res.status).toBe(200)
    expect(res.body.feedback).toBe('Great layout!')
  })

  it('passes context in the user message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Feedback' } }],
      }),
    } as Response)

    await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/png', context: 'fintech SaaS' })

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    const userMessage = body.messages.find((m: any) => m.role === 'user')
    const textBlock = userMessage.content.find((b: any) => b.type === 'text')
    expect(textBlock.text).toContain('Context: fintech SaaS')
  })

  it('sends the skill as a system message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Feedback' } }],
      }),
    } as Response)

    await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/png' })

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    const systemMessage = body.messages.find((m: any) => m.role === 'system')
    expect(systemMessage).toBeTruthy()
    expect(typeof systemMessage.content).toBe('string')
    expect(systemMessage.content.length).toBeGreaterThan(0)
  })

  it('sends image as data URI in image_url block', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Feedback' } }],
      }),
    } as Response)

    await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/png' })

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    const userMessage = body.messages.find((m: any) => m.role === 'user')
    const imageBlock = userMessage.content.find((b: any) => b.type === 'image_url')
    expect(imageBlock.image_url.url).toBe('data:image/png;base64,abc123')
  })

  it('returns 504 on AbortError (timeout)', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(
      Object.assign(new Error('aborted'), { name: 'AbortError' })
    )

    const res = await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/png' })

    expect(res.status).toBe(504)
    expect(res.body.error).toBe('The analysis took too long. Please try again.')
  })

  it('returns 502 when OpenRouter returns an error response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Rate limited' } }),
    } as Response)

    const res = await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/png' })

    expect(res.status).toBe(502)
    expect(res.body.error).toBe('Rate limited')
  })

  it('truncates context to 200 characters server-side', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Feedback' } }],
      }),
    } as Response)

    const longContext = 'a'.repeat(300)
    await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/png', context: longContext })

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    const userMessage = body.messages.find((m: any) => m.role === 'user')
    const textBlock = userMessage.content.find((b: any) => b.type === 'text')
    expect(textBlock.text).toContain('a'.repeat(200))
    expect(textBlock.text).not.toContain('a'.repeat(201))
  })
})
