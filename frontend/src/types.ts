export type View = 'upload' | 'loading' | 'result'

export type InsightCategory = 'ux' | 'visualDesign' | 'usability' | 'dataClarity'

export interface CategoryScore {
  score: number
  evidence: string
}

export interface Insight {
  text: string
  category: InsightCategory
  sentiment: 'positive' | 'issue'
  priority: number
}

export interface AuditResult {
  overall: number
  verdict: string
  categories: Record<InsightCategory, CategoryScore>
  insights: Insight[]
}

export interface FeedbackState {
  view: View
  result: AuditResult | null
  error: string | null
}
