# Chapter 12 — The Future of Data Systems (synthesis)

## A note on this chapter

The sixth early-release edition the user uploaded does not contain a fully-written Chapter 12 (the book's table of contents shows it as the unfinished closing chapter — "???" in the TOC). What follows is a designer-oriented synthesis of the themes the book *builds toward*, drawn from the arc of Parts I–III: data integration, derived views, dataflow as the unifying model, correctness vs. coordination, and the ethical surface of data systems. It's labeled as Chapter 12 to keep the per-chapter file structure intact.

## The synthesis the book is building toward

Across eleven chapters, one idea recurs: most production data architectures are sprawling, accidental constellations of databases, caches, search indexes, analytics warehouses, message queues, and microservices — each holding a piece of the truth, each slightly out of sync with the others, glued together by ad-hoc plumbing.

The book argues for a different organizing principle: **treat a totally-ordered log of events as the system of record, and treat every other store — database, cache, index, dashboard view — as a derived view of that log.** When sources of truth and derived views are clearly separated, a lot of distributed-systems pain gets simpler: consistency is "did this derived view catch up to the log yet?", auditability is built in, schema evolution is reprocessing, and adding a new view is just adding a new consumer.

For designers, this is more than architecture. It changes what the UI can promise and how honestly it can talk about freshness, history, conflicts, and corrections.

## Data integration — the meta-problem

In any non-trivial product, the same fact exists in multiple places. A user's email lives in the auth DB, the CRM, the analytics warehouse, the marketing tool, the support tool, the email service. When the user updates their email in one place, all the others should follow. They never quite do.

The book's framing: stop trying to make every system update every other system point-to-point. Instead, make one system the source of truth (typically an event log) and let every other system subscribe.

For designers, this means:
- **A "single source of truth" is a real architectural decision, not a marketing line.** Ask which store is the source of truth for each piece of user data. The answer determines which UI you should trust for edits.
- **"Sync" is a visible state.** When the user updates their email, the propagation has a duration. Sometimes seconds, sometimes minutes, sometimes "next overnight batch." Surface this when it would affect what the user does next.

## Deriving views — the design principle that falls out

If the log is the source of truth and views are derived, then *adding a new screen* is the same operation as *adding a new view*. The implications for product evolution are large:

- **New analytics screens can be added without changing the operational system.** A new dashboard subscribes to the existing event stream.
- **A/B testing different views of the same data is trivial.** Each variant is its own subscriber.
- **Fixing bugs in derived data is reprocessing, not surgery.** The team fixes the code, replays the log, and the views catch up. No frantic SQL UPDATEs on production.

If the system is built this way, your design work gets more room: you can propose new views, new aggregations, new ways of slicing without triggering a full backend overhaul each time.

If the system is *not* built this way (every screen has its own bespoke endpoint, every change requires a DB migration, "we can't add that filter because the data isn't shaped right"), you'll feel the constraint in every brief. That's worth naming and pushing back on.

## The unbundled database

Another thread the book ties together: a traditional database bundles a lot of features into one box — storage, replication, indexes, transactions, query planning, durability. Modern stacks "unbundle" these into separate, composable systems: an event log for durability and ordering, a stream processor for derivation, a key-value store for serving, a search engine for text, a column store for analytics.

The benefit is flexibility — you choose the right tool for each surface. The cost is integration complexity — keeping them in sync is now your problem.

This explains why product teams now have "platform" or "data platform" specialists between the application developers and the storage layer. The plumbing got rich enough to need its own discipline.

For UX/UI designers, two practical consequences:

- **Different parts of one product can have different consistency, freshness, and availability properties** because they're served by different stores. The login page is strongly consistent (auth DB). The activity feed is eventually consistent (search index). The dashboard is hours-stale (warehouse). The product feels like one thing to the user — but it isn't, internally. Design with that asymmetry in mind.
- **Internal data tooling is itself a product surface.** Data engineers, analysts, and platform engineers have UIs too: dbt, Airflow, Dagster, lineage tools, data catalogs. If Triolla works on these (BI / internal platforms), the lessons of the book apply directly: model dependencies, freshness states, reprocessing flows, lineage visualization.

## Correctness without coordination

Coordination — the act of having distributed nodes agree before proceeding — is expensive. The book's recurring move is: where can you get correctness without coordination?

- **Immutable events** don't need coordination — facts that already happened can't change.
- **CRDTs** merge mathematically, no coordination needed.
- **Idempotency** lets retries be safe without coordination.
- **Per-key linearizability** (within a partition) is cheap; cross-key transactions are expensive.

For designers, the practical insight: **the cheap-to-coordinate parts of a product are where you can move fast. The expensive-to-coordinate parts are where you should slow down and design carefully.**

A like button: low coordination, eventual consistency is fine. A money transfer: high coordination, design for the latency and the failure modes. A medical record edit: high coordination, design for audit and conflict. Knowing which is which lets you set the right pace for the right surface.

## Timeliness vs. integrity

The book draws a distinction between two kinds of correctness:

- **Timeliness** — the data is up to date.
- **Integrity** — the data is consistent, no facts are lost or duplicated, invariants hold.

These are different. A bank can tolerate the dashboard being 15 minutes behind (timeliness violated, fine) but cannot tolerate two account credits where there was supposed to be one (integrity violated, disaster).

A useful design heuristic: **figure out which one matters more for each surface.**

- **Operational screens** (place an order, transfer money, change a permission) — integrity dominates. Latency is acceptable; loss or duplication is not.
- **Analytical screens** (dashboards, trends, reports) — timeliness dominates. Approximate-but-current is often better than precise-but-stale.
- **Audit screens** (history, compliance, "what happened?") — integrity absolutely dominates. They can be slow; they cannot lie.

The "real-time vs. accurate" tradeoff is everywhere and should be a deliberate design call, not an inherited default.

## End-to-end principle

A subtle, important argument from the book: the safest place to enforce invariants is at the very ends of the system — close to the user, close to the source of truth. Intermediate layers can't reliably know whether something has been counted, deduplicated, deduped, applied. Only the endpoints know.

In design terms: **deduplication, retry, and confirmation often have to be UI concerns**, not just backend ones, because the UI is the closest layer to the user's intent. A request that the network dropped halfway through should be retried with a client-generated idempotency key so the backend can dedupe — and the UI is where that key is generated and held.

The book is making a much bigger systems-design argument, but the lesson lands at the UI layer: the buttons, the forms, the optimistic updates, the retry behaviors *are* the integrity layer for everything past them.

## Ethical surfaces of data systems

The closing thread of the book is ethical: data systems are not neutral. The architecture choices the book covers — what gets logged, what gets joined with what, what gets predicted, what gets retained, who can read what — all have human consequences.

For designers, this is not abstract. The interfaces we ship are the visible face of these decisions:

- **Consent and disclosure.** Users should know what's being collected and why, in human language, in the UI.
- **Correction and deletion.** If GDPR or similar regulations are in scope, the UI must support data subject rights — view, export, correct, delete — and the backend must actually honor them. Soft-deletes that pretend to be deletes are deceptive.
- **Prediction and automated decisions.** If the system is making decisions about the user (credit score, fraud flag, content rank), the UI should be able to explain or contest those decisions. "Why am I seeing this?" is a design responsibility.
- **Bias and fairness.** Models trained on historical data inherit historical biases. The UI is often where this becomes visible (or where it gets hidden).

These aren't features to add at the end. They're part of the contract between the system and the user, and the UI is the place that contract is most visible.

## What a designer should take from this chapter

1. **Source of truth is a real, designable concept.** Ask which store owns each fact. Don't let "the canonical email" be ambiguous between five systems.
2. **Different screens of the same product have different freshness, consistency, and availability profiles.** Design with that asymmetry in mind; surface it honestly.
3. **Integrity beats timeliness for high-stakes screens; timeliness beats integrity for exploratory ones.** Make the call deliberately per surface.
4. **The UI is the integrity layer for everything past it.** Idempotency keys, retry semantics, confirmation flows — all of these live partly in the design.
5. **Data ethics is a UX surface.** Consent, correction, explanation, contestation — these are design problems, not just legal ones.

## Looking back across the twelve chapters

The book's arc, in one sentence: **single-machine simplicity is a lie we sell ourselves, and once we stop selling it, we can build systems — and interfaces — that are honest about time, order, freshness, conflict, and failure.** Honest interfaces, in turn, are better interfaces. Users handle "5 minutes stale" gracefully. They handle silent lies catastrophically.

For a UX designer working in data-heavy verticals — cybersecurity, fintech, digital health, BI — the practical takeaway from all twelve chapters is the same: design the unhappy paths, surface the freshness, name the consistency model, and make the system's actual guarantees visible to the user in language they can use.
