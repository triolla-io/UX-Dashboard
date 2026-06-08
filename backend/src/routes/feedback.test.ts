import { describe, it, expect } from 'vitest'
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
    // Should not be a 400 validation error (will 500/502 without real API key — that's fine)
    expect(res.status).not.toBe(400)
  })
})
