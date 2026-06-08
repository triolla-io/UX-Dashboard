export type InsightCategory = 'ux' | 'visualDesign' | 'usability' | 'dataClarity'

export interface CategoryScore {
  score: number
  evidence: string
}

export type Categories = Record<InsightCategory, CategoryScore>

export interface Insight {
  text: string
  category: InsightCategory
  sentiment: 'positive' | 'issue'
  priority: number
}

export type Verdict = 'Above industry average' | 'Near industry average' | 'Below industry average'

export interface AuditResult {
  overall: number
  verdict: Verdict
  categories: Categories
  insights: Insight[]
}

export const CATEGORY_KEYS: InsightCategory[] = ['ux', 'visualDesign', 'usability', 'dataClarity']

export function verdictForScore(score: number): Verdict {
  if (score >= 75) return 'Above industry average'
  if (score >= 55) return 'Near industry average'
  return 'Below industry average'
}

export function computeOverall(categories: Categories): number {
  const sum = CATEGORY_KEYS.reduce((acc, k) => acc + categories[k].score, 0)
  return Math.round(sum / CATEGORY_KEYS.length)
}

export function parseAuditJson(raw: string): unknown {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(body)
}

export function validateAudit(obj: unknown): { categories: Categories; insights: Insight[] } {
  if (typeof obj !== 'object' || obj === null) throw new Error('audit: response is not an object')
  const o = obj as Record<string, any>
  if (typeof o.categories !== 'object' || o.categories === null) {
    throw new Error('audit: missing categories')
  }

  const categories = {} as Categories
  for (const k of CATEGORY_KEYS) {
    const c = o.categories[k]
    if (!c || typeof c.score !== 'number' || c.score < 0 || c.score > 100) {
      throw new Error(`audit: invalid score for ${k}`)
    }
    if (typeof c.evidence !== 'string' || c.evidence.trim().length === 0) {
      throw new Error(`audit: missing evidence for ${k}`)
    }
    categories[k] = { score: Math.round(c.score), evidence: c.evidence.trim() }
  }

  if (!Array.isArray(o.insights) || o.insights.length === 0) {
    throw new Error('audit: missing insights')
  }
  const insights: Insight[] = o.insights.map((it: any, i: number) => {
    if (typeof it?.text !== 'string' || it.text.trim().length === 0) {
      throw new Error(`audit: insight ${i} missing text`)
    }
    if (!CATEGORY_KEYS.includes(it.category)) throw new Error(`audit: insight ${i} bad category`)
    if (it.sentiment !== 'positive' && it.sentiment !== 'issue') {
      throw new Error(`audit: insight ${i} bad sentiment`)
    }
    if (typeof it.priority !== 'number') throw new Error(`audit: insight ${i} bad priority`)
    return {
      text: it.text.trim(),
      category: it.category,
      sentiment: it.sentiment,
      priority: it.priority,
    }
  })

  return { categories, insights }
}

export function buildAuditResult(obj: unknown): AuditResult {
  const { categories, insights } = validateAudit(obj)
  const overall = computeOverall(categories)
  return { overall, verdict: verdictForScore(overall), categories, insights }
}
