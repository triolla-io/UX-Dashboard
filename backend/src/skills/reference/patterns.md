# Patterns — Recurring UX Problems and the System Shapes Behind Them

A field guide for designers. Each entry: the symptom you see in the UI, the system shape that causes it, and the design responses that handle it honestly.

---

## 1. "I posted it, then it disappeared"

**Symptom:** User submits something, sees it appear, refreshes, it's gone. Comes back a few seconds later.

**Cause:** Read-your-writes inconsistency. The write went to the leader; the refresh hit a follower that hadn't replicated it yet. Replication lag.

**Design responses:**
- Mark optimistic UI as "pending" until confirmed (subtle clock icon, slightly muted color).
- Suppress refetch for a few seconds after a user's own write.
- For high-stakes writes (money, medical, regulated), insist on reading from leader for the user's own data.
- Avoid pull-to-refresh on screens immediately after a write.

**Don't:** Show a hard error or "post failed." It didn't fail. It's there. The replica is behind.

→ See Ch. 5.

---

## 2. "I refreshed and the list got shorter"

**Symptom:** A feed or list shows N items, user refreshes, now shows N–2, refresh again, back to N.

**Cause:** Successive reads hit replicas with different lag. Monotonic reads violated.

**Design responses:**
- Sticky-route a session to one replica (engineering decision).
- Use cursors / "load more" instead of refetching the whole list — cursors are stable references, page numbers are not.
- For audit logs, ledgers, and history, surface freshness explicitly ("as of 12:42:08") so the user understands they're seeing a snapshot.

→ See Ch. 5.

---

## 3. "The reply showed up before the question"

**Symptom:** Threaded content arrives in wrong causal order. Reply visible while parent comment is missing.

**Cause:** Consistent prefix reads violated. Causally-related writes went through different paths and arrived at the reader out of order.

**Design responses:**
- Group threaded content by parent ID in rendering, not strict flat chronological order; orphan replies wait for the parent to arrive.
- For ordering that matters legally (audit, transactions), use server-assigned sequence numbers, not client timestamps.
- For chat-like interfaces, briefly buffer incoming events client-side and apply them in order.

→ See Ch. 5, 9.

---

## 4. "Two users see different numbers on the same dashboard"

**Symptom:** Shared dashboard, two users open simultaneously, see different totals.

**Cause:** Each user's session hit a different replica or different materialized-view refresh. Both views are internally consistent; just from different points in time.

**Design responses:**
- Show a "data as of [timestamp]" indicator at dashboard level. Always.
- For collaboration scenarios where users need to agree on what they're looking at, offer a "share this snapshot" pin that locks to a specific timestamp.
- Prefer real-time sync (WebSocket, SSE) over polling — it makes lag visible rather than hidden.

→ See Ch. 5.

---

## 5. "I clicked Submit twice and got charged twice"

**Symptom:** User hits Submit, nothing happens (slow network), clicks again. Order placed twice.

**Cause:** Lack of idempotency. The first request's reply was lost or delayed; the retry created a duplicate.

**Design responses:**
- Generate an idempotency key (UUID) on the client when the user opens the form. Send it with every retry of the same submission. Backend dedupes by key.
- Disable the Submit button on click; show a "submitting…" state with a clear cancellation option.
- After a timeout, show "still working — please don't refresh" rather than offering a duplicate-friendly retry.
- For payments specifically, require server-side idempotency keys as part of the API contract.

→ See Ch. 8, 11.

---

## 6. "Two people edited the same record and one edit silently vanished"

**Symptom:** User A and User B both open an edit form, both save, B's changes overwrite A's. A only finds out hours later.

**Cause:** Lost update. No optimistic concurrency, no row locking, no version checking.

**Design responses:**
- Include a version number / etag with the form data on load. Send it back with save. If the version has advanced, reject the save and show a merge UI.
- Real-time presence ("Alex is editing this now") prevents the situation entirely. Add it where the cost is justified.
- For Git-like merge tooling: take cues from the patterns that have evolved in code editors, design tools, and document editors. Three-pane diffs, accept/reject per field.
- For low-conflict scenarios, accept that "last save wins" but show a full audit log so changes can be recovered.

→ See Ch. 7.

---

## 7. "Two people each toggled the only thing that needed to stay on, and now it's off"

**Symptom:** Capacity constraint silently violated by concurrent action. Both users individually saw a valid state, both made a valid-seeming change, the combined result violates the invariant.

**Cause:** Write skew. The classic example: "at least one doctor must be on call" — both doctors check, see another doctor is on, both leave. Snapshot isolation doesn't prevent this. Only serializable does.

**Design responses:**
- Make the invariant visible. Show "you would be the last one — confirm" before allowing the action.
- Real-time state in shared UI — other approvers' selections, current capacity counters, seat maps.
- For high-stakes invariants, the engineer needs serializable isolation. Push for it. Optimistic concurrency at minimum.
- Materialize the conflict: have a "claim" or "reservation" row that all actors must update, so the race becomes visible.

→ See Ch. 7.

---

## 8. "The dashboard loads in 6 seconds because of one panel"

**Symptom:** A dashboard with many tiles waits for the slowest one. Whole page is unusable for 6 seconds.

**Cause:** Tail latency. The 99th percentile of one query dominates the page load. Often a query against a large table without the right index, or a cross-partition query.

**Design responses:**
- Each panel owns its own loading state. Render the fast ones immediately; the slow one shows a skeleton until ready.
- Lazy-load below-fold panels. Don't compute what the user isn't looking at.
- For chronic offenders, push the calculation off the hot path: a materialized view, refreshed every N minutes, will load instantly even though it's slightly stale.
- Surface "still loading…" affordances, not eternal spinners. If a panel takes >5 seconds, offer a manual retry and an option to "notify me when ready."

→ See Ch. 1, 3.

---

## 9. "Search doesn't find the record I just created"

**Symptom:** User creates a record, immediately searches for it, can't find it.

**Cause:** Search index lag. Search is usually powered by a separate system (Elasticsearch, Solr, OpenSearch, a vector DB) that's updated asynchronously via CDC or batch reindexing.

**Design responses:**
- After a creation, route the user directly to the new record (don't make them search for it). Best UX, also dodges the problem.
- For "you just created X" feeds, render from the operational DB temporarily, then converge to the search index.
- Show a freshness indicator on advanced-search results: "indexed up to 14:32."
- For B2B admin UIs, expose "reindex" as an explicit action where the user has the context to request it.

→ See Ch. 3, 11.

---

## 10. "The dashboard says 1,247 but the export says 1,251"

**Symptom:** A summary tile disagrees with the detailed list it expands into.

**Cause:** The summary comes from a materialized view (or HLL approximation) refreshed every N minutes. The list comes from a live query. They reflect different points in time.

**Design responses:**
- Pin both the tile and the detail to the same refresh cadence and timestamp.
- Surface the approximation honestly: "approx. 1,247 unique users."
- For exports, include the "as of" timestamp in the file/header so users don't bring discrepancies into meetings.

→ See Ch. 3, 11.

---

## 11. "It says 'Saved' but my work is gone after the page refresh"

**Symptom:** UI confirms a save; the data isn't there on reload.

**Cause:** Asynchronous replication where the leader crashed before propagating, async writes that were buffered and lost, or a write to a cache that never made it to durable storage.

**Design responses:**
- For high-stakes writes (forms, configurations, money), verify with the engineer that the write path is synchronous and durable. If it isn't, the "Saved" claim is dishonest.
- Use "Draft saved" rather than "Saved" when the write is local-first / async. Add a sync indicator when it's actually durable.
- For high-stakes inputs (medical orders, financial trades), block the next user step until durable confirmation arrives.

→ See Ch. 5, 7.

---

## 12. "The audit log shows events in the wrong order"

**Symptom:** Two related events are timestamped a few seconds apart but appear out of order, or events from different clients are interleaved confusingly.

**Cause:** Client-side timestamps. Different devices, different clock drift, different network paths. Wall-clock time is not reliable for ordering across machines.

**Design responses:**
- Always use server-assigned timestamps and server-assigned sequence numbers for events that need ordering.
- For audit logs that span multiple sources, sort by sequence number and only *display* the wall-clock time; never sort by it.
- Where uncertainty exists, be honest: "around 14:32" or "between 14:30 and 14:35" beats false precision.

→ See Ch. 8, 9.

---

## 13. "The mobile app shows yesterday's data, then jumps when I open it"

**Symptom:** App resumes from background showing old state; updates in a flash a few seconds later.

**Cause:** Long-suspended app with stale cache. Mobile / web apps can be paused for hours; their data has expired but the UI doesn't know yet.

**Design responses:**
- On resume / Page Visibility change, refetch first, render second. Or render cache immediately *and* refetch in background with a clear "syncing" affordance.
- For long-open modals or forms, refresh underlying data on save and warn the user if it conflicts with their draft.
- Set deliberate cache TTLs that match the user's mental model of freshness for each surface.

→ See Ch. 8.

---

## 14. "One customer's actions slow the product for everyone"

**Symptom:** A big-tenant customer in a multi-tenant SaaS makes the product noticeably slower for all users at the same time.

**Cause:** Hot partition. That tenant's data lives on one shard, or their queries dominate a shared resource (a database, a queue, a worker pool).

**Design responses:**
- For B2B admin UIs, surface per-tenant resource usage. Make whales visible.
- Rate-limit or queue ingest from heavy tenants; show queue position rather than pretending it's instant.
- For SLA-sensitive products, propose tier separation (heavy tenants on dedicated infrastructure) as a design / pricing concern.
- Throttle UI actions that fan out across tenants (admin "do this for everyone" features) with explicit progress.

→ See Ch. 6.

---

## 15. "The notification fired twice"

**Symptom:** User receives the same push notification, email, or in-app toast twice in quick succession.

**Cause:** At-least-once delivery. The notification system retried after an ambiguous failure. The consumer wasn't idempotent.

**Design responses:**
- Deduplicate notifications client-side by event ID. The backend may legitimately deliver an event twice; the UI should show it once.
- For in-app toasts, suppress duplicate messages within a short window.
- For email/push systems, accept that this happens occasionally and design the message so two arrivals isn't catastrophic — no destructive "click here to delete forever" links.

→ See Ch. 11.

---

## 16. "The export downloaded but the numbers don't match what I saw on screen"

**Symptom:** User views a dashboard, exports a CSV, the CSV has slightly different numbers.

**Cause:** Re-running the query at export time hit a different point in the refresh cycle, or used a different aggregation path. Common across the OLTP/OLAP boundary.

**Design responses:**
- Pin the export to the same snapshot the UI is viewing. Pass the snapshot timestamp as part of the export request.
- Stamp the export with "data as of" in a visible header row.
- For high-trust workflows, generate exports as artifacts (saved files with stable URLs) rather than recomputing on demand.

→ See Ch. 3, 10.

---

## 17. "I made an admin change and nothing happened for 30 seconds"

**Symptom:** User changes a permission, role, or feature flag; the change appears successful but doesn't take effect for some time.

**Cause:** Configuration is cached at multiple layers (auth tokens, service caches, in-memory state). Propagation has a duration.

**Design responses:**
- Surface propagation: "Change applied. Will take effect across all services within 60 seconds."
- For high-stakes changes (permission revocation, kill switches), show a verification state: "Verified active on 47 of 50 services." Don't claim success until verified everywhere it matters.
- For feature flags, distinguish "saved" from "rolled out" in the UI.

→ See Ch. 5, 9.

---

## 18. "The real-time chart updates suddenly jumps and revises history"

**Symptom:** A live tile shows a value, then a few seconds later that value jumps up or down — sometimes overwriting what was just displayed.

**Cause:** Late events arriving after the window was reported. The stream processor's watermark hadn't caught all the data yet.

**Design responses:**
- Don't animate values as if they were continuously rising. Step changes with a brief "updated" badge are more honest.
- For final-state displays ("daily total"), wait until the window is closed (watermark passed) before showing as final; show as "preliminary" before that.
- Allow users to opt into "revised" vs. "as-it-arrived" display modes for analytical surfaces.

→ See Ch. 11.

---

## 19. "An old record is missing fields the form requires"

**Symptom:** User opens an old record, the form complains about required fields the user never had to fill in originally.

**Cause:** Schema evolution. The field became required after the record was created. The backend hasn't backfilled.

**Design responses:**
- Distinguish "required for new records" from "required to save changes." Old records should be readable without filling in newly-required fields.
- For records flagged as incomplete due to schema evolution, show a friendly "we now also need X — fill it in next time you edit" notice instead of a blocking error.
- Backfill scripts are a UX event. Communicate them ("we'll be asking everyone to update their company size over the next month") rather than springing them silently.

→ See Ch. 4.

---

## 20. "Deleting this user should have removed their data, but some of it is still around"

**Symptom:** A delete action completes successfully, but related records (comments, files, logs) are still visible.

**Cause:** No multi-object atomicity across services. The user record was deleted in service A, but services B, C, D haven't received the message yet — or one of them failed and is being retried.

**Design responses:**
- Distinguish "deletion initiated" from "deletion complete." For GDPR / privacy contexts, this distinction is legally meaningful.
- Show a progress affordance for cascading deletes ("removing data from 7 services… 4 of 7 done").
- For surfaces where stragglers may persist briefly, soft-hide them in the UI even if they technically still exist, until the cleanup completes.
- For compliance reporting, generate completion certificates only after every downstream system confirms.

→ See Ch. 7, 9.

---

## How to use this guide

When a designer (or PM) describes a UX bug, walk the list. Most are one of these 20. Once you've named the pattern, the design response is usually well-trodden — the goal is recognition and honest UI, not invention.

When a designer is *planning* a new feature in a data-heavy product, walk the list as a checklist. Ask: which of these can occur here? Design the response upfront, not after the bug report.
