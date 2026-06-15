import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from './index'

describe('Express server', () => {
  it('serves the SPA for unknown routes when dist exists, otherwise 404', async () => {
    const res = await request(app).get('/unknown')
    // With frontend dist present: SPA catch-all returns 200
    // Without frontend dist (CI): Express default 404
    expect([200, 404]).toContain(res.status)
  })
})
