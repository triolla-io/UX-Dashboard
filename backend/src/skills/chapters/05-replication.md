# Chapter 5 — Replication

## The frame

Replication = keeping copies of the same data on multiple machines. Why bother? Three reasons: keep the system up when a machine dies (availability), serve users from nearby (latency), and spread read load across many machines (scale).

For a designer, this chapter is the single biggest source of "why is the UI lying to me?" bugs. Replication lag — the gap between when a write hits one machine and when other machines see it — is responsible for an enormous fraction of the strange, hard-to-reproduce UX glitches on consumer and B2B products alike.

## The three replication architectures

### Leader-based (single-leader, primary-replica)
One node is the leader. Writes go to the leader; reads can go to followers. The leader streams its changes to the followers. This is the default for most relational databases (Postgres, MySQL) and many newer ones.

Properties: simple to reason about, but reads from followers are stale. The lag between leader and a given follower can be anywhere from milliseconds to (under load) seconds or minutes.

### Multi-leader
Two or more nodes can both accept writes; they stream changes to each other. Used for multi-datacenter deployments and offline-capable apps.

Properties: writes are fast and local, but two leaders can simultaneously accept conflicting writes. **The conflict resolution problem is now a UX problem.**

### Leaderless (Dynamo-style)
Any node accepts writes; clients write to multiple nodes and read from multiple nodes. Used by Cassandra, Riak, DynamoDB-style stores.

Properties: very fault-tolerant, no single point of failure for writes, but consistency is "eventual" and conflicts are common. The application/UI is more involved in reconciling.

## Replication lag — the four UX problems and their fixes

This is the part to memorize. Each of these is a real, named pattern with a real, named fix.

### Problem 1: "Read your writes"
User posts a comment. UI shows the comment (optimistic). User refreshes. Comment is gone — because the refresh hit a follower that hadn't received the write yet.

**Fixes the engineer might apply:**
- Read the user's own writes from the leader for a short window.
- Track a write timestamp client-side, only read from replicas that have caught up to it.
- Sticky-route the user to a single replica for a session.

**Design moves:**
- Mark optimistic actions clearly (a subtle "pending" indicator) until the round-trip confirms.
- For non-critical objects, just keep showing the optimistic version client-side and don't refetch for a few seconds.
- For critical reads (banking, medical, "is this really saved?"), ask the engineer if reads go to leader — and if not, push for it on those screens.

### Problem 2: "Monotonic reads"
User refreshes a page. Sees a comment. Refreshes again. Comment is gone again — because the second refresh hit a different, even-more-lagged follower. Time appears to run backwards.

**Engineering fix:** sticky-route the user to one replica.

**Design moves:**
- For lists that update over time (notifications, feeds), prefer pagination or cursors over refetching the whole list. Cursors are stable; "page 1 of all results" is not.
- Avoid auto-refresh on screens where seeing data disappear would alarm the user (audit logs, transaction history).

### Problem 3: "Consistent prefix reads"
User sees a question and an answer in a Q&A thread — but they arrive in reverse order. Causality is violated; the screen shows nonsense for a moment.

**Engineering fix:** ensure causally-related writes go through a single partition (or use a system that tracks causality).

**Design moves:**
- For threaded content (chats, comments, replies), display in a way that's robust to brief reordering — e.g., grouped by parent, not strict chronological flat order.
- For event timelines (SOC alerts, audit logs), if order matters legally or operationally, render from a strongly-ordered source — not "whatever the cache says."

### Problem 4: General "users see different things"
Two users on the same page see different counts, different lists, different totals. Each one is internally consistent; they just hit different replicas at different lag levels.

**Design moves:**
- Show a "last updated" timestamp on shared-state screens (dashboards, leaderboards, collaboration tools).
- For collaboration features, prefer real-time sync (WebSockets, server-sent events) over polling — it's lag-revealing rather than lag-hiding.
- Build deliberate "everyone's looking at the same snapshot" affordances when the use case demands it (e.g., a "view as of [timestamp]" pin).

## Synchronous vs. asynchronous replication

**Synchronous:** the leader waits for at least one follower to acknowledge before reporting success. Strong durability — if the leader dies, the data isn't lost — but writes are as slow as the slowest replica.

**Asynchronous:** the leader reports success immediately and ships changes to followers in the background. Fast writes, but if the leader dies before changes propagate, those writes are lost. *Forever.*

This is the lurking risk under every "instant success" toast in your designs. If the system is async-replicated and the user sees "Saved!" — that save is not durable yet. Most of the time it's fine. Occasionally, in a crash, those saves vanish.

**Design move:** for high-stakes writes (money, medical records, legal documents), confirm with the engineer that the write path is synchronous or otherwise durable. The UI's "Saved" claim has to match what the system actually guarantees.

## Multi-leader and conflict resolution

When two leaders accept conflicting writes for the same object — common in offline apps, mobile sync, multi-region products — someone has to resolve it. The options:

- **Last-write-wins (LWW):** keep the one with the latest timestamp. Simple but lossy — the loser's edit is silently dropped. (And timestamps lie — see Chapter 8.)
- **Application-level merge:** the code merges the two values intelligently. Works for some types (e.g., union of tags); not others.
- **Conflict-free replicated data types (CRDTs):** purpose-built data structures (sets, counters, text) that merge mathematically. Used in Figma, Notion-style collaboration.
- **Manual resolution:** show the user "you have a conflict" and let them pick. Last resort.

**Design moves:**
- Ask explicitly which strategy the system uses. If the answer is LWW, design for the silent-data-loss case: show recent edits prominently, audit logs, "edited by" indicators.
- If manual resolution is on the table, that's a real flow to design — and one that's universally awful by default. Look at how Git, iCloud, and Dropbox have evolved their conflict UIs and steal liberally.
- If you're designing a real-time collab product (think Figma, Notion, Linear), CRDTs are likely under it. The "magic" of multi-user editing is mathematical, not magical.

## Leaderless (Dynamo-style) and quorums

Reads and writes go to multiple nodes; you need a "quorum" (e.g., 2 of 3) to agree on what the value is. Concurrent writes can both succeed and need to be reconciled at read time.

For designers, this rarely surfaces directly, except in one place: **multi-value reads.** If the system says "this object has two competing values," some UI has to present that. In consumer apps it's usually hidden; in admin tools and developer-facing products it's exposed.

## What a designer should take from this chapter

1. **"Eventually consistent" is a real engineering state with named UX consequences.** Don't accept "eh, eventually" as a brief — name which of the four problems above applies and design the response.
2. **Optimistic UI is a contract with the user that the action will succeed.** Have a rollback design when it doesn't.
3. **"Saved" is not always saved.** For high-stakes writes, verify the durability model with the engineer.
4. **Conflict UX is a real flow, not an edge case.** Especially in collaboration, offline-first, and multi-region products.
5. **Freshness timestamps belong on every shared-state screen.** Users handle "5 minutes ago" gracefully; they handle silent staleness terribly.

## Connections forward

- Partitioning (Chapter 6) compounds with replication: partition first, then replicate each partition. Both must be reasoned about together.
- The "what does it mean for a system to be consistent" question gets formalized in Chapter 9 (linearizability, causal consistency, etc.).
- The "writes that look like events flowing to consumers" pattern is the seed of Chapter 11's stream processing.
- Why timestamps lie (and why LWW is dangerous) is detailed in Chapter 8.
