# Dashboard Audit Scorecard — Design Spec (v2)

**Date:** 2026-06-08
**Status:** Draft for review (v2 — replaces the consultant-report design after the actual
lead-gen teaser UI was surfaced)
**Author:** Ariel + Claude

## What changed from v1

v1 designed a long, two-pass consultant report. The actual product surface is a **lead-gen
teaser scorecard** (overall score + 4 category scores + a few visible insights + a locked
"Contact Us" block). That makes the long report the wrong deliverable and lets us use much
lighter processing. v2 redesigns around the real surface and around one hard requirement:
**the scores must be derived from the uploaded dashboard, never fabricated.**

## Problem

The product takes a dashboard screenshot and returns a **lead-generation teaser**, already
built in [`ResultScreen.tsx`](../../frontend/src/components/ResultScreen.tsx):

- An **overall score** (0–100) + verdict label ("Below industry average").
- **4 category scores:** UX · Visual Design · Usability · Data Clarity.
- **Top insights** — a few one-liners shown; the rest blurred behind
  "N+ insights are locked" → **Contact Us** (the real conversion goal).

Two critical defects in the current implementation:

1. **The scores are fabricated.** [`ResultScreen.tsx:20-35`](../../frontend/src/components/ResultScreen.tsx#L20-L35)
   `deriveScores()` keyword-counts the prose (`critical`, `strong`, …) and applies hardcoded
   per-category offsets (`base + 10`, `base − 12`, `dataClarity = base − 6`). When feedback is
   empty it falls back to hardcoded mockup numbers `{ux:78, visual:24, usability:71, dataClarity:62}`.
   **None of this is derived from the uploaded dashboard.** This is precisely the
   untrustworthy-number failure the product exists to critique — applied to ourselves. It is
   the product's #1 credibility risk.
2. **Insights are regex-scraped from prose.** [`ResultScreen.tsx:7-18`](../../frontend/src/components/ResultScreen.tsx#L7-L18)
   `parseInsights()` pulls bullet lines out of free-form markdown — fragile, and the backend
   prompt produces a long generic essay (the v1 root cause: starved skill + visual-first
   weighting + Sonnet) that doesn't map cleanly to compact teaser bullets.

The backend ([`feedback.ts`](../../backend/src/routes/feedback.ts)) returns prose; the data
shape does not match what the UI actually needs.

## Goals

- Scores (overall + 4 categories) and insights are produced by the **model**, **grounded in the
  actual uploaded dashboard** — never keyword-derived, never hardcoded.
- DDIA / data-trust lens powers the **Data Clarity** score and produces differentiated insights.
- Compact **structured** output matching the teaser UI; **single-pass, lighter** processing.

## Non-Goals

- Long consultant report (wrong surface — dropped).
- Two-pass / heavy pipeline (single-pass is enough for compact output).
- Leaving OpenRouter (decision: stay on OpenRouter).
- Redesigning the teaser visuals — the scorecard layout already exists; we change the *data*
  feeding it and remove the client-side fabrication.

## Architecture — Single-Pass, Structured Output

```
screenshot + optional context
   │
   ▼  ONE call — Sonnet 4.6 (skill + rubric + structure as system prompt)
   │   model returns STRUCTURED JSON: 4 grounded category scores (+evidence) + ranked insights
   │
   ▼  backend computes overall + verdict from the categories (fixed formula)
   │
   ▼  AuditResult JSON → frontend renders scorecard + locked teaser
```

## Output Schema (the contract)

```ts
// frontend/src/types.ts
interface CategoryScore {
  score: number      // 0–100, grounded in the screenshot
  evidence: string   // why this score, citing specific visible elements (internal/debug;
                     // not necessarily rendered to the client, but proves grounding)
}

interface Insight {
  text: string                                                   // one concrete one-liner
  category: 'ux' | 'visualDesign' | 'usability' | 'dataClarity'
  sentiment: 'positive' | 'issue'
  priority: number                                               // 1 = highest; drives ordering
}

interface AuditResult {
  overall: number                  // computed in backend from categories
  verdict: string                  // computed in backend from overall band
  categories: {
    ux: CategoryScore
    visualDesign: CategoryScore
    usability: CategoryScore
    dataClarity: CategoryScore
  }
  insights: Insight[]              // ~12–16 items, ranked by priority
}

interface FeedbackState {
  view: View
  result: AuditResult | null       // replaces `feedback: string`
  error: string | null
}
```

The frontend shows the top `VISIBLE = 4` insights by `priority`; the remaining
`insights.length − 4` are blurred behind the "N+ insights are locked" → Contact CTA.
Insight selection is **top-priority mixed** (highest-priority items first, positive or issue).

## Grounding Rules — NO Fabrication (core requirement)

This is the heart of v2. Enforced in the Pass prompt + schema + backend:

1. **Every category score derives only from observable evidence in the screenshot**, and each
   carries an `evidence` string citing specific visible elements — e.g. Data Clarity:
   *"No 'as of' timestamp on any of the 6 tiles; reviews aggregated from Yelp + Facebook + Google
   with no per-source freshness; 'Search Position 6,721' has no unit."* Evidence that doesn't name
   visible elements is a failure.
2. **A per-category rubric in the prompt** defines what each score band means against
   observable criteria, so scores are reproducible rather than vibes. Data Clarity's rubric is
   the DDIA lens (freshness indicators, provenance honesty, OLTP/OLAP framing, state coverage,
   unit/label clarity).
3. **Insights must reference a concrete visible element** — generic filler with no anchor
   ("improve visual hierarchy") is banned by the prompt.
4. **Overall is a fixed function of the four category scores, computed in backend code** — the
   model never emits `overall` independently, removing that fabrication vector and guaranteeing
   the overall is consistent with the parts. Formula (default): simple mean of the four,
   rounded. (Weighting Data Clarity higher is an option; flagged as a product decision, default
   = equal weights for honesty/transparency.)
5. **If a category can't be assessed from the screenshot**, the model says so in `evidence` and
   scores conservatively — it must not invent a number.
6. **Backend never substitutes fabricated scores on failure.** If the model output can't be
   parsed/validated after one retry, return an error — do **not** fall back to placeholder
   numbers (the current `{78,24,71,62}` fallback is deleted).

## Scoring Rubric (defined in the critique prompt)

Each category gets band descriptions anchored to observable criteria:

- **UX** — task flow, information scent, navigation clarity, entry point for the eye.
- **Visual Design** — hierarchy, spacing, type scale, color use, chart-type fit.
- **Usability** — affordances, control clarity, state visibility, error/empty handling visible.
- **Data Clarity** *(the DDIA differentiator)* — freshness indicators, source provenance,
  summary/detail consistency risk, OLTP/OLAP honesty, unit/label completeness, approximate-vs-exact.

## Knowledge Base

- **Restore the original `SKILL.md` content into `dashboard.md`** (replacing the edited
  visual-first 86-line prompt) and feed the skill as the system-prompt knowledge layer. The
  skill is what makes Data Clarity scoring + insights differentiated.
- Given single-pass + Sonnet + compact output, the full 2127 lines may be more than needed.
  **Decision for the plan:** start with `SKILL.md` + `reference/cheatsheet.md` +
  `reference/patterns.md` (the operational core, ~600 lines) as the fed knowledge; add chapters
  only if Data Clarity grounding proves weak in testing. (Caching makes either cheap; the
  smaller feed keeps Sonnet focused.)
- **Do NOT author a separate general-UX knowledge file** — UX/visual/usability knowledge comes
  from the model itself.
- **The prompt is the jargon firewall:** insights and evidence must be client-facing plain
  language; the skill informs reasoning, not vocabulary.

## Model & Infrastructure

- **Provider:** OpenRouter (unchanged), `POST /v1/chat/completions`.
- **Model:** `anthropic/claude-sonnet-4-6` (current), single call. Configurable via `OPENROUTER_MODEL`.
- **Structured output:** request JSON; primary path `response_format: {type: "json_object"}` if
  OpenRouter accepts it for the model + explicit schema in the prompt; **fallback:** tolerant
  JSON parse from text (strip code fences). One retry on parse/validation failure, then error.
- **Prompt caching:** `cache_control` breakpoint on the static prefix (skill + rubric +
  schema/structure instructions); volatile content (screenshot, context) after it.

### Cost (per run, estimate)

Single Sonnet 4.6 call, ~10–20k input (knowledge + image) + ~1–2k JSON output ≈ **~$0.03 cold,
~$0.01 warm**. Lighter than v1 by design.

## Code Changes

### Backend — [`feedback.ts`](../../backend/src/routes/feedback.ts)

- One OpenRouter call. System = restored skill + critique/rubric/structure prompt (with
  `cache_control`). User = image (+ optional context ≤ 200 chars, unchanged validation).
- Parse model JSON → **validate** shape (4 categories present, each `score` 0–100 with non-empty
  `evidence`; `insights` non-empty with required fields) → **compute `overall` + `verdict` in
  code** → return `AuditResult`.
- Errors: keep timeout/abort → 504; OpenRouter error → 502; parse/validation failure after one
  retry → 502 with a clear message (never fabricated scores) → 500 otherwise.

### Backend — new prompt files

```
backend/src/skills/
├── dashboard.md          ← REPLACED with original SKILL.md content
├── chapters/, reference/ ← unchanged (reference/* fed; chapters optional per plan decision)
└── prompts/
    └── critique.md       ← rubric + output schema + grounding rules + jargon firewall
```

### Frontend

- [`types.ts`](../../frontend/src/types.ts): replace `feedback: string` with `result: AuditResult | null`
  and add the `AuditResult` / `CategoryScore` / `Insight` types above.
- [`ResultScreen.tsx`](../../frontend/src/components/ResultScreen.tsx):
  - **DELETE `deriveScores()` and `parseInsights()`** (the fabrication + the regex).
  - **DELETE the hardcoded `{78,24,71,62}` fallback.**
  - Render `overall`, `verdict`, the 4 `categories[*].score`, and `insights` from the
    structured `result`. Sort `insights` by `priority`; show top 4, lock the rest.
  - Download report: serialize the structured result to a readable text/markdown form.
- [`App.tsx`](../../frontend/src/App.tsx), `LoadingScreen`, `UploadScreen`: adjust to the
  `result` response shape (was `feedback` string).

## Testing

### Backend ([`feedback.test.ts`](../../backend/src/routes/feedback.test.ts))

- On a mocked model JSON response, the endpoint returns a validated `AuditResult`.
- `overall` is computed correctly from the four category scores (e.g. mean), and `verdict` maps
  to the right band.
- Each category in the response has a non-empty `evidence` string and a 0–100 `score`.
- **Parse/validation failure → 502 with an error, and NO fabricated scores in the body** (the
  anti-fabrication guarantee).
- Existing validation/timeout/error tests updated for the structured shape.

### Frontend ([`ResultScreen.test.tsx`](../../frontend/src/components/ResultScreen.test.tsx))

- Given an `AuditResult`, renders overall, the 4 category scores, and the top-4 insights by
  priority; locks the remainder with the Contact CTA.
- **Regression guard:** the component contains no score-deriving / insight-parsing logic — it
  only renders provided data (assert scores come from props, not from text).

## Open Decisions for the Plan

- **Overall formula:** default simple mean of the four categories; weighting Data Clarity higher
  is a product option (default = equal weights).
- **Knowledge feed size:** start with `SKILL.md` + `cheatsheet.md` + `patterns.md`; add chapters
  if Data Clarity grounding is weak.
- **Insight count target:** ~12–16 total so "N+ locked" reads credibly (≥ 8 locked).

## Success Criteria

- Change the uploaded dashboard → the scores change accordingly; every category score traces to
  a visible-element `evidence` string. No hardcoded or keyword-derived numbers remain anywhere
  in the codebase.
- Insights are concrete (each anchored to a visible element) and ranked; Data Clarity reflects
  real DDIA findings (freshness/provenance/units/states).
- The teaser UI is populated entirely from model output; `deriveScores`/`parseInsights` are gone.
