import { describe, it, expect } from 'vitest'
import { verdictForScore, computeOverall, type Categories } from './audit'
import { parseAuditJson, validateAudit, buildAuditResult } from './audit'

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

const validModel = {
  categories: {
    ux: { score: 72, evidence: 'clear top nav and a single primary CTA' },
    visualDesign: { score: 40, evidence: 'three series in near-identical blues' },
    usability: { score: 55, evidence: 'no visible empty state on the reviews list' },
    dataClarity: { score: 22, evidence: 'no "as of" timestamp on any tile' },
  },
  insights: [
    { text: 'No freshness timestamp on any metric tile', category: 'dataClarity', sentiment: 'issue', priority: 1 },
    { text: 'Strong, scannable card grouping', category: 'visualDesign', sentiment: 'positive', priority: 2 },
  ],
}

describe('parseAuditJson', () => {
  it('parses raw JSON', () => {
    expect(parseAuditJson(JSON.stringify(validModel))).toMatchObject(validModel)
  })
  it('strips ```json code fences', () => {
    const wrapped = '```json\n' + JSON.stringify(validModel) + '\n```'
    expect(parseAuditJson(wrapped)).toMatchObject(validModel)
  })
  it('throws on non-JSON', () => {
    expect(() => parseAuditJson('not json at all')).toThrow()
  })
})

describe('validateAudit', () => {
  it('accepts a well-formed object', () => {
    const v = validateAudit(validModel)
    expect(v.categories.dataClarity.score).toBe(22)
    expect(v.insights).toHaveLength(2)
  })
  it('rejects a missing category', () => {
    const bad = { ...validModel, categories: { ...validModel.categories, dataClarity: undefined } }
    expect(() => validateAudit(bad)).toThrow(/dataClarity/)
  })
  it('rejects a score out of range', () => {
    const bad = { ...validModel, categories: { ...validModel.categories, ux: { score: 140, evidence: 'x' } } }
    expect(() => validateAudit(bad)).toThrow(/ux/)
  })
  it('rejects empty evidence', () => {
    const bad = { ...validModel, categories: { ...validModel.categories, ux: { score: 50, evidence: '  ' } } }
    expect(() => validateAudit(bad)).toThrow(/ux/)
  })
  it('rejects empty insights', () => {
    expect(() => validateAudit({ ...validModel, insights: [] })).toThrow(/insights/)
  })
})

describe('buildAuditResult', () => {
  it('computes overall and verdict from validated categories', () => {
    const r = buildAuditResult(validModel)
    expect(r.overall).toBe(47)
    expect(r.verdict).toBe('Below industry average')
    expect(r.categories.ux.score).toBe(72)
    expect(r.insights[0].priority).toBe(1)
  })
})
