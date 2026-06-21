import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import app from './index'

const MODEL_JSON = JSON.stringify({
  categories: {
    ux: { score: 72, evidence: 'x' }, visualDesign: { score: 40, evidence: 'x' },
    usability: { score: 55, evidence: 'x' }, dataClarity: { score: 22, evidence: 'x' },
  },
  insights: [{ text: 't', category: 'dataClarity', sentiment: 'issue', priority: 1 }],
})
function okModelResponse(content: string) {
  return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) } as Response
}

describe('GET /api/admin/log', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('returns recent usage rows including ip and image id', async () => {
    vi.mocked(fetch).mockResolvedValue(okModelResponse(MODEL_JSON))
    await request(app)
      .post('/api/feedback')
      .set('x-forwarded-for', '5.5.5.5')
      .send({ image: Buffer.from('z').toString('base64'), mediaType: 'image/png' })

    const res = await request(app).get('/api/admin/log')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.rows)).toBe(true)
    const row = res.body.rows.find((r: { ip: string }) => r.ip === '5.5.5.5')
    expect(row).toBeTruthy()
    expect(row).toHaveProperty('id')
    expect(row).toHaveProperty('at')
  })

  it('returns 401 when STATS_TOKEN is set and no token is provided', async () => {
    const prev = process.env.STATS_TOKEN
    try {
      process.env.STATS_TOKEN = 'secret'
      const res = await request(app).get('/api/admin/log')
      expect(res.status).toBe(401)
    } finally {
      if (prev === undefined) {
        delete process.env.STATS_TOKEN
      } else {
        process.env.STATS_TOKEN = prev
      }
    }
  })

  it('returns 200 when STATS_TOKEN is set and correct token is provided', async () => {
    const prev = process.env.STATS_TOKEN
    try {
      process.env.STATS_TOKEN = 'secret'
      const res = await request(app).get('/api/admin/log?token=secret')
      expect(res.status).toBe(200)
    } finally {
      if (prev === undefined) {
        delete process.env.STATS_TOKEN
      } else {
        process.env.STATS_TOKEN = prev
      }
    }
  })
})
