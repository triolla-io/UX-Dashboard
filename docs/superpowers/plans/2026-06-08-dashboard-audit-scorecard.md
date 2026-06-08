# Dashboard Audit Scorecard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fabricated client-side scores with model-produced, dashboard-grounded scores + ranked insights, returned as structured JSON and rendered by the existing teaser UI.

**Architecture:** Single OpenRouter call (Sonnet 4.6). The system prompt feeds the DDIA operational knowledge (`cheatsheet.md` + `patterns.md`) plus an authored `critique.md` (rubric + JSON schema + grounding rules). The model returns 4 grounded category scores (each with `evidence`) + ranked insights; the backend validates the JSON and computes `overall` + `verdict` in code. The frontend renders the structured `AuditResult` directly — the keyword-counting `deriveScores()` and regex `parseInsights()` are deleted.

**Tech Stack:** TypeScript, Express, Vitest (backend); React, Vite, Vitest + Testing Library (frontend); OpenRouter Chat Completions API.

---

## File Structure

**Backend**
- Create `backend/src/skills/prompts/critique.md` — authored prompt: per-category rubric, JSON output schema, grounding rules, jargon firewall.
- Create `backend/src/audit.ts` — `AuditResult` types + pure helpers (`verdictForScore`, `computeOverall`, `parseAuditJson`, `validateAudit`, `buildAuditResult`).
- Create `backend/src/audit.test.ts` — unit tests for the pure helpers.
- Modify `backend/src/routes/feedback.ts` — single structured call, assemble knowledge, parse/validate/compute, error handling (no fabricated fallback).
- Modify `backend/src/routes/feedback.test.ts` — structured-response coverage.

**Frontend**
- Modify `frontend/src/types.ts` — `AuditResult` / `CategoryScore` / `Insight`; `FeedbackState.result`.
- Modify `frontend/src/components/ResultScreen.tsx` — delete fabrication, render structured result.
- Modify `frontend/src/components/ResultScreen.test.tsx` — structured-props coverage + anti-fabrication regression.
- Modify `frontend/src/App.tsx` — parse `AuditResult` response shape, update mock preview.
- Modify `frontend/src/App.test.tsx` — structured response in integration tests.

**Decisions locked from the spec:** overall = rounded simple mean of the 4 categories; verdict bands `>=75 Above`, `>=55 Near`, else `Below`; insights ranked by `priority` (1 = highest), top 4 visible; target ≥ 12 insights so "N+ locked" reads credibly.

---

## Task 1: Authored critique prompt

**Files:**
- Create: `backend/src/skills/prompts/critique.md`

- [ ] **Step 1: Write the prompt file**

Create `backend/src/skills/prompts/critique.md` with exactly this content:

````markdown
# Dashboard Audit — Scoring & Insight Engine

You are Triolla's dashboard audit engine. You receive ONE screenshot of a dashboard. You
produce a structured scorecard plus ranked insights. Your output feeds a client-facing
lead-generation report, so it must be accurate, concrete, and trustworthy.

## Absolute rule: never fabricate

Every score and every insight MUST be grounded in something visible in the screenshot. You are
analyzing a static image — you cannot click, refresh, or observe behavior over time. Judge only
what you can see. If you cannot assess a category from the image, score it conservatively and
say so in its `evidence`. Do NOT invent numbers, trends, or behavior you cannot observe. A tool
that critiques untrustworthy dashboards must not itself emit untrustworthy numbers.

## Score four categories (0–100 each)

For each category, assign a 0–100 score and a one-sentence `evidence` string that cites SPECIFIC
visible elements (tile names, numbers, labels, missing affordances). Bands: 0–39 poor,
40–54 below average, 55–74 average, 75–89 strong, 90–100 excellent.

- **ux** — task flow, information scent, navigation clarity, a clear entry point for the eye.
- **visualDesign** — visual hierarchy, spacing, type scale, color used meaningfully, chart-type fit.
- **usability** — affordances, control clarity, visible state coverage (empty/loading/error), readability.
- **dataClarity** *(Triolla's differentiator — apply the data-trust lens)* — can a user trust what
  they see? Look for: metrics/charts with no "as of" timestamp or freshness indicator; a dashboard
  styled to look live with no evidence it is; a summary tile and its detail that could plausibly
  disagree; multiple data sources shown identically (e.g. reviews from Yelp + Facebook + Google with
  no per-source freshness); approximate values presented as exact; numbers with ambiguous or missing
  units. Score low when these are unaddressed.

## Produce ranked insights

Produce 12–16 insights. Each is ONE concrete sentence that references a specific visible element —
never generic filler like "improve visual hierarchy" with no anchor. Mix positives and issues.
Rank them: `priority: 1` is the single most important; increase the number as importance drops.
The 3–4 highest-priority insights will be shown to the client; the rest are teased behind a
paywall, so make the top ones genuinely valuable.

For each insight set `category` to one of `ux | visualDesign | usability | dataClarity` and
`sentiment` to `positive` or `issue`.

## Client-facing language

Insights and evidence are read by a non-technical client. Use plain business/design language.
Never use backend jargon (replication, partitioning, materialized view, watermark, idempotency) —
translate it into what the user experiences ("the numbers may be hours old", "the totals can
disagree with the detail").

## Output format — STRICT

Output ONLY valid JSON, no prose, no markdown fences, matching exactly this shape. Do NOT include
an `overall` field — it is computed downstream.

```json
{
  "categories": {
    "ux":           { "score": 0, "evidence": "..." },
    "visualDesign": { "score": 0, "evidence": "..." },
    "usability":    { "score": 0, "evidence": "..." },
    "dataClarity":  { "score": 0, "evidence": "..." }
  },
  "insights": [
    { "text": "...", "category": "dataClarity", "sentiment": "issue", "priority": 1 }
  ]
}
```
````

- [ ] **Step 2: Commit**

```bash
git add backend/src/skills/prompts/critique.md
git commit -m "feat: add critique prompt with scoring rubric and grounding rules"
```

---

## Task 2: Audit types + score computation helpers

**Files:**
- Create: `backend/src/audit.ts`
- Test: `backend/src/audit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/audit.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=backend -- audit`
Expected: FAIL — `Cannot find module './audit'`.

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/audit.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=backend -- audit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/audit.ts backend/src/audit.test.ts
git commit -m "feat: add audit types and score computation helpers"
```

---

## Task 3: JSON parsing + validation + result assembly

**Files:**
- Modify: `backend/src/audit.ts`
- Test: `backend/src/audit.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `backend/src/audit.test.ts`:

```ts
import { parseAuditJson, validateAudit, buildAuditResult } from './audit'

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=backend -- audit`
Expected: FAIL — `parseAuditJson is not a function` (and the others undefined).

- [ ] **Step 3: Write minimal implementation**

Append to `backend/src/audit.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=backend -- audit`
Expected: PASS (all audit tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/audit.ts backend/src/audit.test.ts
git commit -m "feat: add audit JSON parsing, validation, and result assembly"
```

---

## Task 4: Rewrite the feedback route as a structured single call

**Files:**
- Modify: `backend/src/routes/feedback.ts`
- Test: `backend/src/routes/feedback.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `backend/src/routes/feedback.test.ts` with:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import app from '../index'

const MODEL_JSON = JSON.stringify({
  categories: {
    ux: { score: 72, evidence: 'clear top nav' },
    visualDesign: { score: 40, evidence: 'low-contrast series' },
    usability: { score: 55, evidence: 'no empty state visible' },
    dataClarity: { score: 22, evidence: 'no as-of timestamp on any tile' },
  },
  insights: [
    { text: 'No freshness timestamp on any tile', category: 'dataClarity', sentiment: 'issue', priority: 1 },
    { text: 'Clean, scannable card grid', category: 'visualDesign', sentiment: 'positive', priority: 2 },
  ],
})

function okModelResponse(content: string) {
  return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) } as Response
}

describe('POST /api/feedback — validation', () => {
  it('returns 400 when image is missing', async () => {
    const res = await request(app).post('/api/feedback').send({ mediaType: 'image/png' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('image is required')
  })

  it('returns 400 when mediaType is invalid', async () => {
    const res = await request(app).post('/api/feedback').send({ image: 'abc123', mediaType: 'image/gif' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('mediaType must be image/png, image/jpeg, or image/webp')
  })
})

describe('POST /api/feedback — structured audit', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => vi.unstubAllGlobals())

  it('returns a validated AuditResult with code-computed overall and verdict', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okModelResponse(MODEL_JSON))
    const res = await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(200)
    expect(res.body.overall).toBe(47)
    expect(res.body.verdict).toBe('Below industry average')
    expect(res.body.categories.dataClarity.score).toBe(22)
    expect(res.body.categories.dataClarity.evidence).toBeTruthy()
    expect(res.body.insights[0].priority).toBe(1)
  })

  it('feeds the DDIA knowledge into the system prompt', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okModelResponse(MODEL_JSON))
    await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png' })
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    const system = body.messages.find((m: any) => m.role === 'system')
    const systemText = typeof system.content === 'string'
      ? system.content
      : system.content.map((p: any) => p.text).join('\n')
    expect(systemText).toContain('data-trust') // from the critique prompt / cheatsheet
    expect(systemText.toLowerCase()).toContain('freshness')
  })

  it('parses JSON wrapped in code fences', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okModelResponse('```json\n' + MODEL_JSON + '\n```'))
    const res = await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(200)
    expect(res.body.overall).toBe(47)
  })

  it('retries once on unparseable output, then succeeds', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(okModelResponse('sorry, here is your audit:'))
      .mockResolvedValueOnce(okModelResponse(MODEL_JSON))
    const res = await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(200)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
  })

  it('returns 502 with an error and NO fabricated scores when output stays invalid', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(okModelResponse('nope'))
      .mockResolvedValueOnce(okModelResponse('still nope'))
    const res = await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(502)
    expect(res.body.error).toBeTruthy()
    expect(res.body.overall).toBeUndefined()
    expect(res.body.categories).toBeUndefined()
  })

  it('returns 502 when OpenRouter returns an error response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Rate limited' } }),
    } as Response)
    const res = await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(502)
    expect(res.body.error).toBe('Rate limited')
  })

  it('returns 504 on AbortError (timeout)', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    const res = await request(app).post('/api/feedback').send({ image: 'abc', mediaType: 'image/png' })
    expect(res.status).toBe(504)
    expect(res.body.error).toBe('The analysis took too long. Please try again.')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace=backend -- feedback`
Expected: FAIL — current route returns `{ feedback }`, not `{ overall, ... }`.

- [ ] **Step 3: Rewrite the route**

Replace the entire contents of `backend/src/routes/feedback.ts` with:

```ts
import { Router, Request, Response } from 'express'
import { readFileSync } from 'fs'
import path from 'path'
import { buildAuditResult, parseAuditJson } from '../audit'

const router = Router()

const ALLOWED_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const readSkill = (rel: string) =>
  readFileSync(path.resolve(__dirname, '../skills', rel), 'utf-8')

// DDIA operational knowledge (de-biased: the old visual-first dashboard.md is no longer fed)
// + the authored rubric/schema/grounding prompt.
const SYSTEM_PROMPT = [
  readSkill('reference/cheatsheet.md'),
  readSkill('reference/patterns.md'),
  readSkill('prompts/critique.md'),
].join('\n\n---\n\n')

class OpenRouterError extends Error {}

async function callModel(image: string, mediaType: string, contextText: string, signal: AbortSignal): Promise<string> {
  const userText = `Analyze this dashboard screenshot and return the audit JSON.${contextText ? ` Context: ${contextText}` : ''}`
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [
        {
          role: 'system',
          content: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${image}` } },
            { type: 'text', text: userText },
          ],
        },
      ],
    }),
    signal,
  })

  if (!response.ok) {
    const errData = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new OpenRouterError(errData.error?.message || 'OpenRouter error')
  }

  const data = (await response.json()) as any
  const content: string | undefined = data.choices?.[0]?.message?.content
  if (!content) throw new OpenRouterError('No content returned from model')
  return content
}

router.post('/', async (req: Request, res: Response) => {
  const { image, mediaType, context } = req.body

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'image is required' })
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return res.status(400).json({ error: 'mediaType must be image/png, image/jpeg, or image/webp' })
  }

  const contextText = context ? String(context).slice(0, 200) : ''
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)

  try {
    let lastParseError: unknown
    for (let attempt = 0; attempt < 2; attempt++) {
      const content = await callModel(image, mediaType, contextText, controller.signal)
      try {
        const audit = buildAuditResult(parseAuditJson(content))
        clearTimeout(timeoutId)
        return res.json(audit)
      } catch (e) {
        lastParseError = e
      }
    }
    clearTimeout(timeoutId)
    console.error('feedback: model output failed validation', lastParseError)
    return res.status(502).json({ error: 'The analysis could not be completed. Please try again.' })
  } catch (e) {
    clearTimeout(timeoutId)
    if (e instanceof Error && e.name === 'AbortError') {
      return res.status(504).json({ error: 'The analysis took too long. Please try again.' })
    }
    if (e instanceof OpenRouterError) {
      return res.status(502).json({ error: e.message })
    }
    return res.status(500).json({ error: 'Something went wrong. Please try again later.' })
  }
})

export default router
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --workspace=backend -- feedback`
Expected: PASS. Then run the full backend suite: `npm test --workspace=backend` — all green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/feedback.ts backend/src/routes/feedback.test.ts
git commit -m "feat: single structured audit call with grounded scores, no fabricated fallback"
```

---

## Task 5: Frontend audit types

**Files:**
- Modify: `frontend/src/types.ts`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `frontend/src/types.ts` with:

```ts
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
```

- [ ] **Step 2: Verify it compiles (other files will error until updated — that's expected)**

Run: `npm run build --workspace=frontend`
Expected: type errors in `App.tsx` / `ResultScreen.tsx` referencing `feedback`. These are fixed in Tasks 6–7. Do not commit yet.

---

## Task 6: Render the structured result in ResultScreen

**Files:**
- Modify: `frontend/src/components/ResultScreen.tsx`
- Test: `frontend/src/components/ResultScreen.test.tsx`

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `frontend/src/components/ResultScreen.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResultScreen from './ResultScreen'
import type { AuditResult } from '../types'

const result: AuditResult = {
  overall: 47,
  verdict: 'Below industry average',
  categories: {
    ux: { score: 72, evidence: 'e' },
    visualDesign: { score: 40, evidence: 'e' },
    usability: { score: 55, evidence: 'e' },
    dataClarity: { score: 22, evidence: 'e' },
  },
  insights: [
    { text: 'Visible one A', category: 'ux', sentiment: 'positive', priority: 2 },
    { text: 'Visible one B', category: 'dataClarity', sentiment: 'issue', priority: 1 },
    { text: 'Visible one C', category: 'usability', sentiment: 'issue', priority: 3 },
    { text: 'Visible one D', category: 'visualDesign', sentiment: 'positive', priority: 4 },
    { text: 'Locked one E', category: 'ux', sentiment: 'issue', priority: 5 },
    { text: 'Locked one F', category: 'ux', sentiment: 'issue', priority: 6 },
  ],
}

describe('ResultScreen', () => {
  it('renders the overall verdict and the four category scores', () => {
    render(<ResultScreen result={result} error={null} onReset={vi.fn()} />)
    expect(screen.getByText('Below industry average')).toBeInTheDocument()
    expect(screen.getByText('72')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getByText('55')).toBeInTheDocument()
    expect(screen.getByText('22')).toBeInTheDocument()
  })

  it('shows the four highest-priority insights and locks the rest', () => {
    render(<ResultScreen result={result} error={null} onReset={vi.fn()} />)
    // highest priority (1) renders first
    const visible = screen.getAllByTestId('visible-insight')
    expect(visible).toHaveLength(4)
    expect(visible[0]).toHaveTextContent('Visible one B') // priority 1
    expect(screen.getByText(/insights are locked/)).toHaveTextContent('2+ insights are locked')
  })

  it('shows an error and hides the report when error is present', () => {
    render(<ResultScreen result={null} error="Something went wrong." onReset={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.')
    expect(screen.queryByTestId('download-button')).not.toBeInTheDocument()
  })

  it('calls onReset when the reset button is clicked', async () => {
    const onReset = vi.fn()
    render(<ResultScreen result={result} error={null} onReset={onReset} />)
    await userEvent.click(screen.getByTestId('reset-button'))
    expect(onReset).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace=frontend -- ResultScreen`
Expected: FAIL — `ResultScreen` still expects a `feedback` prop and calls `deriveScores`.

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `frontend/src/components/ResultScreen.tsx` with:

```tsx
import type { AuditResult, InsightCategory } from '../types'

interface Props {
  result: AuditResult | null
  error: string | null
  onReset: () => void
}

const VISIBLE = 4

const CATEGORY_META: { key: InsightCategory; label: string; icon: string }[] = [
  { key: 'ux', label: 'UX', icon: '⊞' },
  { key: 'visualDesign', label: 'Visual Design', icon: '✏' },
  { key: 'usability', label: 'Usability', icon: '✦' },
  { key: 'dataClarity', label: 'Data Clarity', icon: '▦' },
]

interface GaugeProps { score: number; size?: number }
function ScoreGauge({ score, size = 110 }: GaugeProps) {
  const r = 40
  const cx = 55
  const arcLen = Math.PI * r
  const filled = (score / 100) * arcLen
  const color = score < 40 ? '#C62828' : score < 65 ? '#E65100' : '#2E7D32'
  return (
    <svg viewBox="0 0 110 58" width={size} height={size * 0.53}>
      <path d={`M 15 52 A ${r} ${r} 0 0 1 95 52`} fill="none" stroke="#EBEBEB" strokeWidth="9" strokeLinecap="round" />
      <path d={`M 15 52 A ${r} ${r} 0 0 1 95 52`} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${filled} ${arcLen}`} />
      <text x={cx} y="46" textAnchor="middle" fill={color} fontSize="20" fontWeight="800" fontFamily="Syne, sans-serif">
        {score}
      </text>
    </svg>
  )
}

function serializeReport(result: AuditResult): string {
  const lines: string[] = []
  lines.push(`Triolla AI Audit Report`)
  lines.push(`Overall: ${result.overall}/100 — ${result.verdict}`, '')
  for (const { key, label } of CATEGORY_META) {
    const c = result.categories[key]
    lines.push(`${label}: ${c.score}/100 — ${c.evidence}`)
  }
  lines.push('', 'Insights:')
  for (const it of [...result.insights].sort((a, b) => a.priority - b.priority)) {
    lines.push(`- [${it.sentiment}] ${it.text}`)
  }
  return lines.join('\n')
}

export default function ResultScreen({ result, error, onReset }: Props) {
  const ranked = result ? [...result.insights].sort((a, b) => a.priority - b.priority) : []
  const visible = ranked.slice(0, VISIBLE)
  const lockedItems = ranked.slice(VISIBLE)

  const handleDownload = () => {
    if (!result) return
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const blob = new Blob([serializeReport(result)], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `triolla-audit-${ts}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <div>
      <div className="top-banner"><span>✨</span> Triolla AI Enterprise Dashboard Intelligence</div>
      <nav className="nav">
        <div className="nav-logo">triolla</div>
        <button className="nav-cta">Contact Us</button>
      </nav>

      <section className="result-hero">
        <div className="report-card">
          <div className="report-card-header">Triolla AI Audit Report</div>

          {error || !result ? (
            <div className="report-error" role="alert">{error || 'No result available.'}</div>
          ) : (
            <>
              <div className="report-overview">
                <div className="report-gauge-wrap"><ScoreGauge score={result.overall} size={110} /></div>
                <div className="report-verdict">
                  <div className="report-verdict-label">Overall Dashboard Score</div>
                  <div className="report-verdict-title">{result.verdict}</div>
                </div>
              </div>

              <div className="score-cards">
                {CATEGORY_META.map(({ key, label, icon }) => (
                  <div className="score-card" key={key}>
                    <div className="score-card-icon">{icon}</div>
                    <div className="score-card-label">{label}</div>
                    <div className="score-card-value">{result.categories[key].score}<span>/100</span></div>
                  </div>
                ))}
              </div>

              <div className="report-insights">
                <div className="insights-title">Top insights</div>
                <ul className="insights-list">
                  {visible.map((it, i) => (
                    <li className="insight-item" key={i} data-testid="visible-insight">
                      <span className="insight-star">✦</span>{it.text}
                    </li>
                  ))}
                </ul>

                {lockedItems.length > 0 && (
                  <div className="insights-locked-wrap">
                    <ul className="insights-locked-list">
                      {lockedItems.slice(0, 8).map((it, i) => (
                        <li className="insight-item" key={i}>
                          <span className="insight-star">✦</span>{it.text}
                        </li>
                      ))}
                    </ul>
                    <div className="insights-locked-overlay">
                      <div className="lock-icon-wrap">🔒</div>
                      <div className="locked-title">{lockedItems.length}+ insights are locked</div>
                      <div className="locked-desc">
                        Contact Triolla to unlock the complete professional review with a free expert consultation
                      </div>
                      <button className="locked-cta">Contact Us</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="report-actions">
            {result && !error && (
              <button className="action-btn" onClick={handleDownload} data-testid="download-button">
                ↓ Download Report
              </button>
            )}
            <button className="action-btn" onClick={onReset} data-testid="reset-button">
              ← Analyze Another
            </button>
          </div>
        </div>

        <p className="trust-row" style={{ marginTop: 20 }}>
          Free <span>·</span> No Commitment <span>·</span> Results in &lt; 60s
        </p>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --workspace=frontend -- ResultScreen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types.ts frontend/src/components/ResultScreen.tsx frontend/src/components/ResultScreen.test.tsx
git commit -m "feat: render structured audit result; remove client-side score fabrication"
```

---

## Task 7: Wire App to the structured response

**Files:**
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

- [ ] **Step 1: Update the integration tests**

In `frontend/src/App.test.tsx`, replace the two `text: async () => JSON.stringify({ feedback: ... })`
success mocks with a structured `AuditResult`, and assert on rendered content. Replace the
"shows loading … then result on success" and "returns to upload …" tests' fetch bodies and
assertions with:

```tsx
const AUDIT = {
  overall: 47,
  verdict: 'Below industry average',
  categories: {
    ux: { score: 72, evidence: 'e' },
    visualDesign: { score: 40, evidence: 'e' },
    usability: { score: 55, evidence: 'e' },
    dataClarity: { score: 22, evidence: 'e' },
  },
  insights: [{ text: 'No freshness timestamp on tiles', category: 'dataClarity', sentiment: 'issue', priority: 1 }],
}
```

- For the success test: `resolveFetch({ ok: true, text: async () => JSON.stringify(AUDIT) })`, then
  `await waitFor(() => expect(screen.getByText('Below industry average')).toBeInTheDocument())`.
- For the reset test: `text: async () => JSON.stringify(AUDIT)`, then wait for `reset-button`.
- The error test is unchanged (still `{ error: '...' }`).

Full replacement of the two affected `it(...)` blocks:

```tsx
  it('shows loading screen after submit, then result on success', async () => {
    let resolveFetch!: (v: any) => void
    const pending = new Promise((r) => { resolveFetch = r })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending))

    render(<App />)
    const file = new File(['img'], 'shot.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await userEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())

    resolveFetch({ ok: true, text: async () => JSON.stringify(AUDIT) })

    await waitFor(() => expect(screen.getByText('Below industry average')).toBeInTheDocument())
  })

  it('returns to upload screen when Start Over is clicked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(AUDIT),
    }))

    render(<App />)
    const file = new File(['img'], 'shot.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await userEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => expect(screen.getByTestId('reset-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('reset-button'))
    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })
```

(Add the `AUDIT` const at the top of the `describe` block.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace=frontend -- App`
Expected: FAIL — `App` still sets `feedback` and passes it to `ResultScreen`.

- [ ] **Step 3: Update App.tsx**

Replace the entire contents of `frontend/src/App.tsx` with:

```tsx
import { useState } from 'react'
import { AuditResult, FeedbackState } from './types'
import UploadScreen from './components/UploadScreen'
import LoadingScreen from './components/LoadingScreen'
import ResultScreen from './components/ResultScreen'

const MOCK = import.meta.env.DEV && location.search.includes('preview=result')
const MOCK_RESULT: AuditResult = {
  overall: 47,
  verdict: 'Below industry average',
  categories: {
    ux: { score: 78, evidence: 'clear top nav and tab structure' },
    visualDesign: { score: 24, evidence: 'low-contrast secondary labels' },
    usability: { score: 71, evidence: 'consistent card affordances' },
    dataClarity: { score: 62, evidence: 'no freshness timestamps on any tile' },
  },
  insights: [
    { text: 'No data freshness timestamps on the metric tiles', category: 'dataClarity', sentiment: 'issue', priority: 1 },
    { text: 'Strong visual hierarchy across primary metrics', category: 'visualDesign', sentiment: 'positive', priority: 2 },
    { text: 'KPI grouping is intuitive and scannable', category: 'ux', sentiment: 'positive', priority: 3 },
    { text: 'Consistent card structure improves scanability', category: 'visualDesign', sentiment: 'positive', priority: 4 },
    { text: 'Multi-source totals may disagree with their detail', category: 'dataClarity', sentiment: 'issue', priority: 5 },
    { text: 'Ambiguous unit labels on the conversion funnel', category: 'dataClarity', sentiment: 'issue', priority: 6 },
  ],
}

const initialState: FeedbackState = {
  view: MOCK ? 'result' : 'upload',
  result: MOCK ? MOCK_RESULT : null,
  error: null,
}

export default function App() {
  const [state, setState] = useState<FeedbackState>(initialState)

  const handleSubmit = async (image: string, mediaType: string, context: string) => {
    setState({ view: 'loading', result: null, error: null })
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mediaType, context }),
      })

      const raw = await res.text()
      let data: Partial<AuditResult> & { error?: string } = {}
      if (raw) {
        try {
          data = JSON.parse(raw)
        } catch {
          throw new Error(
            'The analysis service returned an unexpected response. Please make sure the server is running and try again.'
          )
        }
      }

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again later.')
      }
      if (typeof data.overall !== 'number' || !data.categories) {
        throw new Error('The analysis service did not return a valid result. Please try again.')
      }
      setState({ view: 'result', result: data as AuditResult, error: null })
    } catch (e) {
      const message =
        e instanceof TypeError
          ? 'Could not reach the analysis service. Please make sure the server is running and try again.'
          : (e as Error).message
      setState({ view: 'result', result: null, error: message })
    }
  }

  const handleReset = () => setState(initialState)

  if (state.view === 'loading') return <LoadingScreen />
  if (state.view === 'result') {
    return <ResultScreen result={state.result} error={state.error} onReset={handleReset} />
  }
  return <UploadScreen onSubmit={handleSubmit} />
}
```

- [ ] **Step 4: Run tests + build to verify**

Run: `npm test --workspace=frontend` — all green.
Run: `npm run build --workspace=frontend` — compiles with no type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/App.test.tsx
git commit -m "feat: wire frontend to structured AuditResult response"
```

---

## Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suites**

Run: `npm test --workspace=backend` — all green.
Run: `npm test --workspace=frontend` — all green.

- [ ] **Step 2: Confirm the fabrication is gone**

Run: `grep -rn "deriveScores\|parseInsights\|68 - critical" frontend/src`
Expected: no matches (the keyword-counting fabrication is fully removed).

- [ ] **Step 3: Manual smoke test (optional, requires OPENROUTER_API_KEY)**

Run the app (`npm run dev`), upload a dashboard screenshot, and confirm: scores render, the
`evidence` for Data Clarity references real visible elements, insights are concrete, and the
locked count is `insights.length − 4`.

- [ ] **Step 4: Commit any final cleanup if needed**

```bash
git status   # should be clean
```

---

## Notes for the implementer

- **Do not reintroduce a fabricated fallback.** If the model output can't be validated, the route
  returns 502 — the product must never show invented scores.
- The old biased `backend/src/skills/dashboard.md` is simply no longer read. Leave it in place
  (harmless) or delete in a follow-up; it is not part of the system prompt anymore.
- OpenRouter passes Anthropic `cache_control` through on system content parts; if a future
  OpenRouter change rejects it, the call still works without caching (cost-only impact).
