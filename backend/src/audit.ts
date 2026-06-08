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

export interface AuditResult {
  overall: number
  verdict: string
  categories: Categories
  insights: Insight[]
}

export const CATEGORY_KEYS: InsightCategory[] = ['ux', 'visualDesign', 'usability', 'dataClarity']

export function verdictForScore(score: number): string {
  if (score >= 75) return 'Above industry average'
  if (score >= 55) return 'Near industry average'
  return 'Below industry average'
}

export function computeOverall(categories: Categories): number {
  const sum = CATEGORY_KEYS.reduce((acc, k) => acc + categories[k].score, 0)
  return Math.round(sum / CATEGORY_KEYS.length)
}
