# Dashboard Critique Pipeline — Design Spec

**Date:** 2026-06-08
**Status:** Draft for review
**Author:** Ariel + Claude

## Problem

The product takes a dashboard screenshot and returns a professional UX critique. The
critique must read like a senior consultant's deliverable, with the DDIA / data-trust
lens as Triolla's differentiator.

The current output is a competent but **generic** UX audit. Root cause, found in the code:

1. **The skill is starved.** [`backend/src/routes/feedback.ts`](../../backend/src/routes/feedback.ts)
   sends only `dashboard.md` (~86 lines) as the system prompt. The full skill — 12 chapters
   + patterns + cheatsheet + glossary, ~2127 lines — sits unused in `backend/src/skills/`.
   `dashboard.md` itself is an *edited-down* adaptation of the original skill.
2. **The prompt is mis-weighted.** `dashboard.md` instructs the model to lead with
   "Visual hierarchy & clarity" and "weight it heavily", pushing it toward generic visual
   findings and demoting the data-trust differentiator.
3. **The model is weaker than the benchmark.** The product runs Sonnet 4.6. The
   benchmark output the user values was produced by a stronger model (Opus-class) running
   the skill openly, layering its own consulting knowledge (persona, design alternatives,
   product strategy) on top of the DDIA data lens.

Key insight: the missing material (persona frameworks, "BI reference" patterns, design
alternatives) is **not** a set of files we lack — it is the model's own UX/consulting
knowledge, which a strong model produces when given the right structure and not
over-constrained. The fix is therefore: feed the full skill, adopt a consultant-grade
output structure, use a strong model, and stop over-constraining.

## Goals

- Professional, consultant-grade critique for **any** dashboard type.
- DDIA / data-trust as the differentiator lens, with general UX coverage from the model.
- **Maximum quality** is the priority; latency and cost are secondary (but tracked).

## Non-Goals

- Authoring a new general-UX knowledge base (the model already has this knowledge).
- Switching off OpenRouter (decision: stay on OpenRouter).
- Real-time / streaming UI rework beyond what the two-pass flow requires.

## Architecture — Two-Pass Pipeline

```
screenshot + optional context
   │
   ▼  PASS 1 — Extract (vision)
   │   "Observe, don't judge." → structured inventory JSON:
   │   tiles[], numbers, data-source badges, timestamps, units,
   │   window labels, visible states, domain/intent guess
   │
   ▼  PASS 2 — Critique
   │   inputs: inventory + screenshot + FULL skill (~2127 lines)
   │           + output-structure instructions + golden exemplar
   │
   ▼  DASHBOARD UX AUDIT (consultant-grade markdown)
```

**Why two-pass:** Pass 1 forces the model to *look* before it judges — this is what prevents
the single-pass failure mode of skipping straight to generic opinions and missing concrete
evidence (multi-source provenance, missing timestamps, ambiguous units). Pass 2 then reasons
over an explicit evidence inventory rather than re-deriving it while also writing prose.

**Why not full pipeline:** chosen for the latency/cost/quality balance — two Opus calls
(~6–10s, ~$0.15 warm) capture most of the per-lens-pipeline quality at a fraction of the
wall-clock and spend.

## Model & Infrastructure

- **Provider:** OpenRouter (unchanged). Endpoint: `POST /v1/chat/completions`.
- **Model:** `anthropic/claude-opus-4-8` for both passes (was `anthropic/claude-sonnet-4-6`).
  Configurable via `OPENROUTER_MODEL`.
- **Prompt caching:** apply `cache_control: {type: "ephemeral"}` breakpoints on the static
  prefix (full skill + structure instructions + exemplar) so repeat runs read it at ~0.1×.
  OpenRouter passes Anthropic `cache_control` through. Static content first; volatile content
  (screenshot, inventory, user context) after the last breakpoint.
- **Structured output (Pass 1):** request the inventory as JSON. Primary path: explicit JSON
  schema in the prompt + `response_format: {type: "json_object"}` if OpenRouter accepts it for
  the model; **fallback:** parse JSON from the text response, tolerant of code-fence wrappers.
  Degrade gracefully — never hard-fail the run on a structured-output quirk.
- **Thinking/effort:** rely on prompt quality; pass OpenRouter reasoning params only if
  confirmed supported. Do not block the design on them.

### Cost (per run, estimates)

| | Cold | Warm (cached prefix) |
|---|---|---|
| Two-pass, Opus 4.8 | ~$0.35 | ~$0.15 |

Prompt caching of the ~28k-token skill is the dominant cost lever — far more than model choice.

## Knowledge Base

Feed the **full existing skill** to Pass 2 as the data-trust knowledge layer:

```
backend/src/skills/
├── dashboard.md          ← REPLACED: was the edited 86-line prompt.
│                            Becomes the original SKILL.md content (intro + 4 questions
│                            + 7 mental models), OR is removed in favor of loading the
│                            original skill text. (Decision in plan: restore original.)
├── chapters/01..12.md    ← kept, fed in full
└── reference/
    ├── patterns.md       ← kept
    ├── cheatsheet.md     ← kept
    └── glossary.md       ← kept
```

- **Do NOT author `ux-heuristics.md`** — general UX/IA/a11y/typography knowledge comes from
  the model itself.
- The full skill carries backend jargon (replication, watermark, etc.). **Pass 2's prompt
  is the jargon firewall:** it instructs client-facing plain language in the final output,
  so the chapters inform the *reasoning* (depth, the "why") without leaking jargon to the client.

### New files

```
backend/src/skills/
├── prompts/
│   ├── extract.md        ← Pass 1 system prompt + inventory JSON schema
│   └── critique.md       ← Pass 2 system prompt: output structure, tone, jargon firewall
└── exemplars/
    └── example-audit.md  ← one golden, consultant-grade audit as the quality target
```

## Output Structure (Consultant-Grade)

Pass 2 produces this structure (adopted from the benchmark output the user validated):

1. **Domain & Intent** — what the dashboard is, who it serves, and the data-infrastructure
   lens (OLTP/OLAP, materialized views, batch vs. live, provenance).
2. **Business Goal** — what the screen exists to accomplish; the user's core question.
3. **Persona** — who reads this, their literacy, motivation, fear, cognitive-load tolerance,
   context of use.
4. **Pain Point Audit** — grouped: Critical Issues / Friction Points / Missed Opportunities.
   Each: visible evidence → consequence → fix. Data-trust findings (freshness, provenance,
   states, OLTP/OLAP honesty) appear here as first-class items when relevant.
5. **Design Alternatives** — 2–3 named directions with their tradeoffs and the pattern each uses.
6. **Recommendation** — what to do short-term vs. longer-horizon, including the product-strategy
   take where one exists.

Calibration: scale depth to the dashboard. A simple dashboard yields a shorter audit. On a
non-data dashboard the data-trust lens yields fewer items — that is correct, not a gap.

## Code Changes — `backend/src/routes/feedback.ts`

Becomes a two-call orchestrator:

1. Validate request (unchanged: `image`, `mediaType` allow-list, `context` ≤ 200 chars).
2. **Load prompts + knowledge once at module load** (like the current `readFileSync`):
   - `prompts/extract.md`, `prompts/critique.md`, `exemplars/example-audit.md`
   - assembled full skill text (dashboard.md + chapters + reference).
3. **Pass 1** → OpenRouter with `extract` system prompt + image. Parse inventory JSON
   (with fallback parser).
4. **Pass 2** → OpenRouter with `critique` system prompt (skill + structure + exemplar, with
   `cache_control`) + a user message carrying the inventory + image + optional context.
5. Return `{ feedback }` (the Pass 2 markdown), unchanged response shape so the frontend is
   untouched.

### Error handling

- Reuse current per-request timeout/abort (raise budget to ~90s for two calls). Return 504 on
  abort, 502 on OpenRouter error, 500 otherwise — matching existing semantics.
- **Pass 1 failure is recoverable:** if extraction fails or returns unparseable JSON, fall
  back to a single-pass critique (Pass 2 with the screenshot but no inventory) rather than
  erroring. Log the degradation.
- Never silently truncate inputs.

## Testing

Extend [`feedback.test.ts`](../../backend/src/routes/feedback.test.ts) (currently mocks one
`fetch`). New coverage:

- Two `fetch` calls happen, in order (extract → critique).
- The critique call's system content includes the full skill (assert on a known
  patterns/chapters phrase, not just non-empty).
- The critique call carries the Pass-1 inventory in the user message.
- `cache_control` breakpoint present on the static prefix of the critique call.
- Inventory JSON parse + fallback parser (code-fence-wrapped JSON).
- Pass-1 failure → single-pass fallback still returns 200 with feedback.
- Existing validation/timeout/error tests updated for the two-call shape.

## Open Decisions for the Plan

- Exact `dashboard.md` handling: restore the original SKILL.md text vs. load the upstream
  skill verbatim. (Lean: restore original SKILL.md content into `dashboard.md`.)
- Whether to include all 12 chapters or a curated subset if token budget/caching argues for it
  (default: all 12 — caching makes the cost negligible).
- Final source for the golden exemplar (the validated PatientPop benchmark, lightly edited).

## Success Criteria

- On the PatientPop benchmark screenshot, output matches the consultant-grade structure and
  surfaces the data-trust findings (freshness, multi-source provenance, OLTP/OLAP, states)
  **and** persona + design alternatives + product-strategy recommendation.
- On a simple non-data dashboard, output stays proportionate and does not manufacture
  data-trust findings.
- Frontend requires no change (response shape preserved).
