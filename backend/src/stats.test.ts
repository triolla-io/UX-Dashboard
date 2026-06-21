import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import app from './index'

const MODEL_JSON = JSON.stringify({
  categories: {
    ux: { score: 72, evidence: 'clear top nav' },
    visualDesign: { score: 40, evidence: 'low-contrast series' },
    usability: { score: 55, evidence: 'no empty state visible' },
    dataClarity: { score: 22, evidence: 'no as-of timestamp on any tile' },
  },
  insights: [
    { text: 'No freshness timestamp', category: 'dataClarity', sentiment: 'issue', priority: 1 },
  ],
})

function okModelResponse(content: string) {
  return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) } as Response
}

describe('GET /api/stats', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('returns usage stats shape', async () => {
    const res = await request(app).get('/api/stats')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('totalRuns')
    expect(res.body).toHaveProperty('uniqueUsers')
    expect(res.body).toHaveProperty('runsLast24h')
    expect(Array.isArray(res.body.perDay)).toBe(true)
  })

  it('records a run after a successful audit', async () => {
    vi.mocked(fetch).mockResolvedValue(okModelResponse(MODEL_JSON))

    const before = (await request(app).get('/api/stats')).body.totalRuns

    const audit = await request(app)
      .post('/api/feedback')
      .set('x-forwarded-for', '7.7.7.7')
      .send({ image: 'abc', mediaType: 'image/png' })
    expect(audit.status).toBe(200)

    const after = (await request(app).get('/api/stats')).body.totalRuns
    expect(after).toBe(before + 1)
  })

  it('does not record a run for a failed/validation-rejected request', async () => {
    const before = (await request(app).get('/api/stats')).body.totalRuns

    await request(app)
      .post('/api/feedback')
      .set('x-forwarded-for', '7.7.7.8')
      .send({ mediaType: 'image/png' }) // no image -> 400

    const after = (await request(app).get('/api/stats')).body.totalRuns
    expect(after).toBe(before)
  })
})
