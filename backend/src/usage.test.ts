import { describe, test, expect } from 'vitest'
import { createUsageStore } from './usage'

const DAY = 24 * 60 * 60 * 1000

describe('usage store', () => {
  test('counts total runs', () => {
    const store = createUsageStore(':memory:')
    store.record('ip-a', 1000)
    store.record('ip-a', 2000)
    store.record('ip-b', 3000)

    expect(store.stats(4000).totalRuns).toBe(3)
  })

  test('counts unique users by ip hash', () => {
    const store = createUsageStore(':memory:')
    store.record('ip-a', 1000)
    store.record('ip-a', 2000)
    store.record('ip-b', 3000)

    expect(store.stats(4000).uniqueUsers).toBe(2)
  })

  test('counts runs in the last 24h', () => {
    const store = createUsageStore(':memory:')
    const now = 10 * DAY
    store.record('ip-a', now - 2 * DAY) // older than 24h
    store.record('ip-a', now - 1000) // within 24h
    store.record('ip-b', now - 500) // within 24h

    expect(store.stats(now).runsLast24h).toBe(2)
  })

  test('groups runs per day, most recent first', () => {
    const store = createUsageStore(':memory:')
    const now = 10 * DAY
    store.record('ip-a', now) // day 10
    store.record('ip-b', now) // day 10
    store.record('ip-a', now - DAY) // day 9

    const perDay = store.stats(now).perDay
    expect(perDay[0]).toEqual({ date: '1970-01-11', runs: 2 })
    expect(perDay[1]).toEqual({ date: '1970-01-10', runs: 1 })
  })
})
