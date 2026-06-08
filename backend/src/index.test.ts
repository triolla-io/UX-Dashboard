import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from './index'

describe('Express server', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown')
    expect(res.status).toBe(404)
  })
})
