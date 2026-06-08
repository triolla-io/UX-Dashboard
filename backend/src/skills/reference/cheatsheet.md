# Cheatsheet — Design Review One-Pager

Pin this. Walk it any time you're reviewing a data-heavy screen.

---

## The four questions (ask these every time)

1. **Where does this data live, and how fresh is it?**
   Source of truth? Replica? Cache? Search index? Materialized view? Each has a different lag profile.

2. **What happens when two people change the same thing at once?**
   Last-write-wins? Merge? Block? Conflict UI? Pick one — by accident or by design.

3. **What ordering does the user actually see?**
   Server sequence? Client timestamp? Causal? Random? Anything ordered by client clock will lie.

4. **What does the system promise, and what does it merely hope?**
   ACID? Eventual? Best-effort? The UI claim must match the actual guarantee.

---

## Freshness — surface it honestly

| Type of data | What to show |
|---|---|
| Strongly-consistent (balance, inventory, auth state) | Nothing — assume current |
| Eventually-consistent (feeds, profiles, search) | "Updated 12s ago" or refresh affordance |
| Materialized view (dashboard tiles) | "Data as of 14:32" at the panel or dashboard level |
| Batch-computed (analytics, reports) | "Refreshed daily at 02:00 UTC" |
| Real-time stream window | "Last 5 min · updated every 30s" |

If you can't show freshness because you don't know it, that's a question to ask before shipping.

---

## States to design (not just happy path)

For any data-heavy screen, design these explicitly:

- **Empty** — never seen, no data yet
- **Loading** — fetching for the first time
- **Loaded** — the canonical happy state
- **Stale** — loaded once, may be out of date now
- **Refreshing** — re-fetching in the background
- **Partial** — some panels loaded, others failed or pending
- **Error** — server returned an error
- **Offline** — no connection, showing cached data
- **Conflict** — two writers, manual resolution needed
- **Permission-denied** — auth or role-based block
- **Rate-limited** — too many requests, backoff
- **Deprecated** — feature is sunsetting, message about migration

Skipping any of these is shipping a bug.

---

## The "Saved" lie

Before shipping a "Saved" confirmation, verify with the engineer:

- [ ] Is the write **synchronous and durable** before the success reply?
- [ ] If async, is there a follow-up confirmation path (e.g., a webhook, a polling endpoint, an event)?
- [ ] What happens if the user closes the tab between submit and confirm?
- [ ] What's the idempotency story if the user retries?

If any answer is "I don't know," the "Saved" label is dishonest. Use "Submitted," "Draft saved," or "Sent for processing" until durability is confirmed.

---

## The retry-safety checklist

For any action that can be retried (Submit, Save, Send, Pay, Confirm):

- [ ] Client generates an idempotency key (UUID) when the form opens.
- [ ] The key travels with every retry of the same submission.
- [ ] Server dedupes by key — verify this is in the API contract.
- [ ] The button is disabled during the in-flight request.
- [ ] After a timeout, the UI shows "still working — don't refresh" rather than offering a fresh-looking retry button.
- [ ] On confirmed failure, retry uses the *same* key (so a successful prior attempt isn't duplicated).

---

## Data model smell tests

When reviewing a brief:

- "Show me everyone who…" → expect this to be slow on document/key-value stores; trivial on relational; very fast on graph.
- "Second-degree connections" / "everyone who reports to X transitively" → wants a graph database. If the backend is relational, this will be slow.
- "Global search across all tenants" → potentially catastrophic on partitioned data. Ask before designing.
- "Real-time dashboard" → almost certainly batch-refreshed every N minutes. Get the actual N.
- "Audit log" → wants event-sourced or CDC-derived; ask if it actually is.

---

## Concurrency sniff tests

Ask "what happens if two users do this simultaneously?" for:

- Any edit form
- Any toggle that gates capacity ("at least one X must remain on")
- Any single-selection across a group (assign-to, claim-this, lock-this)
- Any approval workflow with multiple approvers
- Any inventory-style decrement
- Any "first to claim wins" flow

If the answer is "we haven't thought about it," it's a bug. Design the conflict UI.

---

## OLTP vs. OLAP — which world are you in?

| | Operational (OLTP) | Analytical (OLAP) |
|---|---|---|
| Query latency | Sub-second expected | Seconds to minutes acceptable |
| Data freshness | Current | Minutes-to-hours stale |
| Per-screen rows | Few (one user's data) | Many (aggregations across millions) |
| UI pattern | Forms, lists, detail views | Charts, tiles, drill-downs |
| Failure mode | "It's broken" | "The numbers look wrong" |
| Filter freedom | Limited (need indexes) | Generous (column store) |
| "Real-time" means | Truly now | "Refreshed in the last 15 min" |

Don't blend these in one screen without surfacing the difference.

---

## "Real-time" honesty

"Real-time" is the most-abused word in product briefs. Translate it before designing:

- **Truly live** — push from server (WebSocket, SSE). Used for chat, presence, collaborative editing.
- **Polled** — client refetches every N seconds. Looks live, but with N-second lag.
- **Stream-windowed** — aggregates over the last N minutes; updates as windows close. Has watermark lag.
- **Batch-refreshed** — recomputed every N minutes/hours. Not live in any meaningful sense, but often labeled that way.

Ask which one. Then design freshness affordances that match.

---

## Triolla-vertical quick map

- **Cyber (SOC/SIEM):** stream processing + event ordering + hot keys (noisy assets). Time-series freshness is the dominant UX concern.
- **Fintech:** strong consistency, transactions, idempotency, audit. "Saved" must mean saved.
- **Digital health:** schema evolution (records outlive UIs), audit/provenance, deletion compliance (GDPR/HIPAA).
- **BI/dashboards:** star schemas, materialized views, freshness timestamps, OLTP/OLAP boundary, approximate counts.

---

## Red flags in a brief

If you see any of these, pause and ask:

- "Real-time" with no definition of N
- "Just like Excel" (Excel is unbounded; the DB isn't)
- "Search everything instantly" (search index lag, partition scans)
- "Edit by anyone, anytime" (conflict UX undefined)
- "Always available, always accurate" (CAP forbids this during partitions)
- "Show me everything that ever happened" (data retention, archival, cost)
- "Custom filters across any field" (index cost, write performance)
- "Undo anything" (event sourcing or transactional history required)
- "Permission changes take effect immediately" (auth caches lag)

Each one is a real engineering decision. Surface it during design, not after.

---

## When in doubt

- Honest uncertainty beats false precision.
- Surface freshness; don't hide it.
- Optimistic UI needs a rollback design.
- Design the unhappy paths.
- "Saved" is a contract. Verify before claiming it.
- The buttons and forms ARE the integrity layer for everything behind them.
