import { describe, it, expect } from 'vitest'
import { verdictForScore, computeOverall, type Categories } from './audit'

const cats = (ux: number, vd: number, us: number, dc: number): Categories => ({
  ux: { score: ux, evidence: 'e' },
  visualDesign: { score: vd, evidence: 'e' },
  usability: { score: us, evidence: 'e' },
  dataClarity: { score: dc, evidence: 'e' },
})

describe('verdictForScore', () => {
  it('returns Above for >= 75', () => expect(verdictForScore(75)).toBe('Above industry average'))
  it('returns Near for 55..74', () => expect(verdictForScore(60)).toBe('Near industry average'))
  it('returns Below for < 55', () => expect(verdictForScore(40)).toBe('Below industry average'))
})

describe('computeOverall', () => {
  it('is the rounded mean of the four category scores', () => {
    expect(computeOverall(cats(72, 40, 55, 22))).toBe(47) // 189/4 = 47.25 -> 47
  })
})
