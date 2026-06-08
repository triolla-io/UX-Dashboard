# Chapter 11 — Stream Processing

## The frame

Batch processing assumes the data is finished — a bounded set you process once. Stream processing assumes the data is never finished — events arrive continuously, and you process them as they come. The shift from one to the other is the biggest architectural change in modern data systems over the last decade.

For designers, this chapter is the one that explains how "real-time" features actually work. Live dashboards, fraud detection, SOC alerting, recommendation freshness, push notifications, change feeds, collaborative apps — all live here. And every one of them carries new UX problems: late events, out-of-order arrivals, windowing, watermarks, "approximate" results.

## Events and event streams

The unit is the event: a small, immutable fact that something happened. "User clicked button X at time T." "Sensor read value V." "Trade T was settled." Events flow into a stream, in roughly the order they happened, and consumers read them.

Two shapes of system:

### Messaging systems (queues, pub/sub)
RabbitMQ, ActiveMQ, AWS SQS. Producers publish, consumers consume, the broker often discards messages after delivery. Optimized for "do this work somewhere; once it's done, forget about it."

### Partitioned log-based streams
Kafka, Kinesis, Pulsar. Producers append to a log; consumers read at their own pace; messages are kept for days or forever. The log is the source of truth.

The log-based shape is what most modern stream-first architectures are built on. Three properties matter for designers:

- **Replayability:** consumers can rewind and reprocess. Bug in the analytics? Replay last week's events through the fixed code. Numbers retroactively correct themselves.
- **Multiple consumers:** the same events feed the dashboard, the alerting system, the audit log, and the search index — independently, at their own pace. Each can fail without affecting the others.
- **Ordering within a partition:** events for the same key arrive in order. Across keys, no order guarantee.

UI relevance:
- "**Reprocessed**" is a thing that happens. Yesterday's numbers can shift overnight. Surface this when accuracy matters.
- **Different consumers have different lag.** The dashboard might be 30 seconds behind events; the alerting system might be 1 second behind; the search index might be 5 minutes behind. Same source, different freshness. Show freshness per surface, not globally.

## Databases and streams — the unification

The chapter's deepest argument: **a database is just the snapshot of a stream of changes.** Every write to a database is an event. If you capture those events, you can replay them to rebuild any state, any read model, any derived view.

This reframing has practical consequences.

### Change data capture (CDC)
A pattern where every change to the operational database is captured as an event and published to a stream. Downstream consumers — search indexes, analytics warehouses, caches, other services — subscribe to the stream and stay in sync automatically.

CDC is one of the most useful "boring" technologies of the decade. It eliminates a whole class of "the search index is out of sync with the database" bugs by making the search index a *subscriber* to database changes rather than a separate write path.

UI consequence: when CDC is in place, the lag between a write and its appearance in the search index / dashboard / cache is bounded and observable. Engineers can tell you "the search index is 800ms behind the database." Design freshness indicators around that.

### Event sourcing
A more radical pattern: don't store the current state at all; store the *log of events* that produced it. Current state is always derived by replaying events.

Used in: financial systems, audit-heavy products (legal, medical, regulated), some collaborative editors, version control systems (Git is essentially event-sourced).

Properties:
- **Perfect audit log, for free.** Every change is a record. Who, what, when — all there.
- **Time travel.** Reconstruct the state of the system as of any past moment. "What did this patient's record look like on March 14?" — answerable.
- **Multiple read models.** Build different views for different screens, all from the same events.

Design implications:
- **Undo, history, and "view as of" become natural.** If the engineer says "this is event-sourced," the UI can lean into time-aware features.
- **The current state can be revised retroactively.** A new event that arrives late, or a correction event, can change historical reads. Design "as of" timestamps and revision indicators.
- **Compensating events, not deletes.** "Refund" is a new event, not a deletion of the original "purchase." The audit trail stays clean. This shows up in UI as: things don't get deleted, they get superseded.

### State, streams, and immutability
The argument the chapter pushes: events are *immutable facts*, while state is a *mutable summary*. Mutable state is harder to reason about than immutable events; if you keep the events, you can rebuild state any way you want, retroactively.

This is the philosophical core of modern data architecture. It's worth letting it sink in. For Triolla's verticals:
- **Cyber:** every alert is an event; the "alert state" (open/closed/triaged) is derived. Audit and replay come free.
- **Fintech:** every trade is an event; positions are derived. Regulatory replay is the whole business.
- **Health:** every observation is an event; the current chart is the derived view. EHR migrations get much easier.

## Processing streams — the operations

Stream processors do a few core things:

### Transformations
Map every incoming event to a new event. Filter out events that don't matter. Enrich events with data from elsewhere.

### Aggregations and windowing
"Total clicks in the last 5 minutes." But "the last 5 minutes" is ambiguous — five minutes by what clock?

Three notions of time:
- **Event time** — when the event actually happened (in the source system).
- **Processing time** — when the stream processor saw the event.
- **Ingestion time** — when the event entered the streaming system.

These don't agree. An event that happened at 12:00:00 might arrive at the stream processor at 12:00:08 (network delay) or at 12:34:00 (mobile device that was offline for half an hour).

Windowing is how you reconcile this. Two strategies:
- **Tumbling / hopping windows** — fixed time buckets, e.g., every 1-minute window.
- **Sliding windows** — overlapping windows, e.g., trailing 5 minutes recomputed every second.
- **Session windows** — variable-length, defined by gaps in user activity.

UI relevance:
- **Real-time dashboards show *windowed* aggregates, not instant aggregates.** The "current value" is "the value as of the last completed window." Design the freshness language: "Updates every minute. Last refreshed 12s ago."
- **Tile flicker is windowing.** When a tile shows 47 then jumps to 51, that's the window's late events arriving and revising the aggregate. Decide whether to smooth this (show "47 — updating") or revise (show "51, was 47").

### Late events and watermarks
What if an event arrives *after* its window has been computed? Options:
- **Drop it.** Cheap, but the numbers are wrong.
- **Update the window retroactively.** Correct, but downstream consumers see revisions.
- **Use watermarks** — a heuristic boundary that says "we're done with this window, late events are minor enough to ignore (or handle separately)."

Watermarks are the engineer's way of saying "we're calling this window closed at some point, knowing some events will be late and excluded." This is honest tradeoff territory. The UI should mirror that honesty: a "final" figure when the window is closed, with a note about late-event reconciliation if it matters.

## Stream joins — three flavors

Joining two streams (or a stream and a table) is harder than joining two batch datasets because the inputs are unbounded.

- **Stream-stream join** — match events from two streams that occurred within a time window. "Match each click with the corresponding impression, within 30 minutes."
- **Stream-table join** — enrich each event with data from a slowly-changing table. "For each transaction, look up the merchant's category."
- **Table-table join** (materialized) — maintain a continuously-updated joined view.

UI relevance: enrichment is doable in real time, but cross-stream correlation has latency proportional to the join window. "Did the user complete the funnel?" can only be answered after the funnel's time window has elapsed.

## Fault tolerance in streams

Two semantic guarantees the engineer might offer:

- **At-least-once** — every event is processed at least once. May be processed twice. The application must be **idempotent** to tolerate this.
- **Exactly-once** — every event is processed exactly once, even with failures. Expensive but achievable in modern systems (Kafka transactions, Flink checkpoints).

UI relevance is real:
- **At-least-once** means a notification might fire twice. A "transaction processed" message might appear twice. The UI must deduplicate (by event ID) or design for "this is fine, ignore duplicates."
- **Exactly-once is a contract.** If the system promises it and the UI relies on it, the design can assume single delivery. Verify before assuming.

## What a designer should take from this chapter

1. **"Real-time" is a windowed aggregate, almost always.** Show the window size and last-refresh time honestly.
2. **Late events cause revision.** Tiles that change retroactively are an honest reflection of reality, but the UI must explain them.
3. **CDC makes "sync between systems" a solved problem with bounded, observable lag.** Surface the lag.
4. **Event sourcing unlocks history, undo, and "view as of."** If the system is event-sourced, lean into those features in the design.
5. **Idempotency is a UX concern.** Action buttons, retries, "did this submit twice?" — all rest on whether the backend deduplicates by event ID. Carry the idempotency key in the UI.
6. **Event time ≠ processing time.** For anything user-perceived as a timeline, use event time and acknowledge the small lag in arrival.

## Connections forward (and back)

- This chapter unifies what Chapters 5, 7, and 9 separately struggled with: replication is just a stream of changes; transactions can be reframed as event logs; consensus produces a totally-ordered event log. The whole book points toward this synthesis.
- The "everything is derived from an event log" worldview is the foundation Kleppmann argues should organize future data systems. For designers, the practical version is: when designing for products with audit, history, undo, "view as of," or multi-view consistency requirements, look for whether the system has an event log under it. If it does, the UI can do remarkable things almost for free.
