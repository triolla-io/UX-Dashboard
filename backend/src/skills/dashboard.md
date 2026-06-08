
# Designing Data-Intensive Applications — for Designers

*Audience: Product UX/UI designers (Triolla)*

## Why this skill exists

Designers ship the surface. The surface lies about the system underneath unless the designer understands the system. A "Save" button that returns instantly is lying if the write is asynchronous. A "Last updated 2s ago" timestamp is lying if the replica is 30 seconds behind. A real-time feed is lying if it's actually a 5-second poll. A "1,247 results" count is lying if it was computed over a stale snapshot.

Most of the hardest UX problems on data-heavy products — and Triolla's verticals (cybersecurity, fintech, digital health, BI) are all data-heavy — come from the gap between what the system can actually guarantee and what the UI claims it guarantees. Closing that gap is a design skill, not just an engineering skill.

This skill turns Kleppmann's book into a designer's working vocabulary: just enough mental model to make better decisions about loading states, refresh logic, conflict UX, ordering, freshness indicators, error states, and the hundred other places the system's truth bleeds into the screen.

## The four questions to ask of any data-heavy screen

Before designing a screen that shows data, get crisp answers to these four. Most bad UX on data products comes from skipping one of them.

1. **Where does this data live, and how fresh is what I'm showing?**
   Is it the source of truth, a replica, a cache, a search index, a materialized view? Each one has a different "lag profile." See: **Chapter 5 (Replication)**, **Chapter 11 (Streams)**.

2. **What happens when two people change the same thing at once?**
   Last-write-wins? Merged? Blocked? Manual conflict resolution? The answer determines whether you need conflict UI at all, and what it looks like. See: **Chapter 5 (Replication)**, **Chapter 7 (Transactions)**.

3. **What ordering guarantees does the user actually see?**
   Will events arrive in the order they were sent? In the order they were created? In any order at all? Ordering glitches are the #1 cause of "this UI feels broken but I can't say why." See: **Chapter 8 (Trouble with Distributed Systems)**, **Chapter 9 (Consistency & Consensus)**.

4. **What does the system promise the user, and what does it merely hope?**
   ACID? Eventually consistent? Best-effort? The UI must be honest about which it is. A wire transfer ≠ a like count. See: **Chapter 7 (Transactions)**, **Chapter 9 (Consistency & Consensus)**.

## The seven mental models that carry most of the weight

These are the shapes I want a designer to recognize on sight when reading a brief, a Jira ticket, or a backend doc.

### 1. Reliability / scalability / maintainability are three different conversations
A system that's reliable (works) is not the same as one that scales (works at 10× load) or one that's maintainable (still works in 3 years with a new team). Designers conflate them. When a PM says "make this scale," ask which one they mean — the UI implications differ. (Chapter 1.)

### 2. The data model dictates the shape of every screen
Relational (rows + joins), document (nested JSON-like trees), graph (nodes + edges) are not interchangeable. A document store makes a profile screen trivial but a "list everyone who reports to X transitively" screen near-impossible. The data model leaks into your IA whether you want it to or not. (Chapter 2.)

### 3. Reads and writes have opposite physics
Optimize for write throughput → reads get slower or staler. Optimize for read latency → writes get more expensive (more indexes, more denormalization). Every "this list takes 4 seconds to load" decision was made earlier, at write time, by someone who optimized the other side. (Chapter 3.)

### 4. Schemas evolve; nothing in production is ever finished
Fields get added, renamed, deprecated. Old clients keep running. The UI must tolerate missing fields and unknown values gracefully — this is forward/backward compatibility as a design constraint. (Chapter 4.)

### 5. Replication lag is real, visible, and you must design for it
The user clicks "Post," sees their post, switches devices, doesn't see their post. This is not a bug — it's read-your-writes consistency, and the fix is partly a backend decision and partly a UI decision (optimistic update, sticky reads, "syncing" pill). (Chapter 5.)

### 6. Partitioning ("sharding") means some operations are cheap and some are catastrophic
Single-user views: cheap. "Top 10 across all users": expensive. "Search everyone whose name contains X across the global tenant": potentially impossible in real time. If your design assumes a global-scan operation is fast, verify it. (Chapter 6.)

### 7. Distributed systems lie to you about time, order, and identity
Clocks drift. Messages arrive out of order. The "same" user can appear as two different sessions. Any UI that relies on "this happened before that" needs server-side ordering, not client timestamps. (Chapters 8 & 9.)

## How to use this skill

When designing or reviewing a screen, walk the four questions above. If the answer to any of them is "I don't know," that's a question for the engineering lead before pixels are pushed — not after.

For specific patterns, jump to:
- `reference/glossary.md` — every term that'll come up in eng conversations, defined for designers.
- `reference/patterns.md` — recurring UX problems and the system shape that causes them (replica lag, hot partition, write skew, etc.) with design responses.
- `reference/cheatsheet.md` — a one-pager for design reviews. Pin it.

For depth on any single topic, the `chapters/` folder has 12 chapter summaries — read the one that maps to the question you're holding. They're written for designers, not engineers.

## When NOT to use this skill

- Pure visual / brand / typography decisions.
- Marketing pages, landing pages, content sites.
- Static dashboards on tiny datasets where none of this matters.
- When the answer is genuinely "ask the engineer" — this skill helps you ask better questions, not replace the conversation.

## Triolla-specific notes

The verticals Triolla designs for sit at different points on the data-correctness spectrum:

- **Cybersecurity (SOC, SIEM, IAM):** stream processing (Ch. 11) and event ordering (Ch. 9) are the dominant concerns. Alert timelines must be honest about what's real-time vs. windowed.
- **Fintech:** transactions (Ch. 7) and consistency (Ch. 9) are non-negotiable. "Eventual" is unacceptable for balances.
- **Digital health:** schema evolution (Ch. 4) and audit/provenance (Ch. 11) matter — clinical records outlive every UI redesign.
- **BI / dashboards:** column stores, analytics queries, batch vs. stream (Chs. 3, 10, 11). The "real-time dashboard" is usually neither.

---

# cheatsheet

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

---

# glossary

# Glossary — Distributed Data Terms, for Designers

Definitions written for product UX/UI designers. Goal: hold your own in the conversation when an engineer says one of these words, and know which design questions it implies.

---

## A

**ACID** — A four-letter shorthand for the guarantees a database transaction provides: atomicity, consistency, isolation, durability. Often invoked as a quality signal; in practice each letter has its own gotchas. The designer-relevant ones are atomicity (all-or-nothing), isolation (concurrent operations don't interfere), and durability ("Saved" means saved). See Ch. 7.

**At-least-once delivery** — A message-delivery guarantee that says: every message will be delivered, but possibly multiple times. Receivers must be idempotent. Design implication: confirmation toasts, push notifications, and event-driven UI actions need deduplication or must be safe to apply twice.

**At-most-once delivery** — Every message is delivered zero or one times. Cheaper, but messages can be silently dropped. Rare in production systems where it matters.

**Atomicity** — In a transaction, all the changes happen together or none do. Failure handling, not concurrency. The opposite is a partial-success state — which is real in microservice architectures and must be designed for. See Ch. 7.

**Availability** — The system responds to requests. In the CAP theorem context, specifically: can the system still serve users during a network partition? Trades off against consistency. See Ch. 9.

**Avro** — A binary serialization format with explicit, evolvable schemas. Common in analytics pipelines. Tolerates schema drift gracefully — old code reading new data and vice versa. See Ch. 4.

---

## B

**Backward compatibility** — New code can read old data. Required for any deploy where existing records will continue to be read. See Ch. 4.

**Batch processing** — Processing a finite, bounded amount of data in one job. Slow but reproducible. The engine behind dashboards, search indexes, ML training. Output is "as of the last successful run." See Ch. 10.

**Bloom filter** — A probabilistic data structure that says "definitely not here" or "maybe here." Used by LSM-tree databases to skip files that don't contain a key. You'll never see one directly, but their presence hints you're on an LSM system.

**B-tree** — The classical disk-based index structure. Updates in place. Predictable read and write performance. Used by Postgres, MySQL InnoDB, most "traditional" databases. See Ch. 3.

**Byzantine fault** — A failure where a node behaves arbitrarily — sending wrong values, lying about its state. Rare in cooperative systems (your typical SaaS), central to adversarial ones (blockchains, multi-party finance).

---

## C

**Cache invalidation** — One of the two genuinely hard problems in computer science (the others are naming things and off-by-one errors). When the source data changes, every cache holding a copy must be told. Failures here cause "why is this old value still showing?" bugs.

**CAP theorem** — During a network partition, a system can be consistent OR available, not both. Often misquoted as "pick two of three." More useful framing: see PACELC. See Ch. 9.

**Causal consistency** — Operations that depend on each other (A caused B) are seen in order; independent operations may be reordered. Sufficient for most user-perceived ordering needs (chat, threaded comments). Cheaper than linearizability. See Ch. 9.

**CDC (Change Data Capture)** — A pattern where every change to a database is captured as an event and published to a stream. Downstream consumers (search indexes, warehouses, caches) subscribe to stay in sync. The "boring" technology behind most modern data integration. See Ch. 11.

**Cluster** — A group of machines coordinating to act as one system.

**Coalescing** — Combining multiple updates to the same key into one. Common in stream processing.

**Coordination** — Distributed nodes agreeing on something. Expensive. The book's recurring move is to design correctness *without* coordination (immutability, CRDTs, idempotency).

**CRDT (Conflict-free Replicated Data Type)** — A data structure that merges concurrent updates mathematically, without coordination. The technology under Figma, parts of Notion, real-time collaborative editing. The "magic" of conflict-free multi-user editing.

**CRUD** — Create, Read, Update, Delete. The four basic operations on a resource. The default mental model that event sourcing pushes against.

---

## D

**Data lake** — A storage system (usually object storage like S3) holding raw, unstructured or semi-structured data, often in formats like Parquet or Avro. Fresh but messy. Compared to a data warehouse, which is curated and structured.

**Data warehouse** — A curated analytical store. Snowflake, BigQuery, Redshift, Databricks SQL. The thing your BI dashboards usually read from. Hours-stale by design. See Ch. 3, 10.

**Denormalization** — Storing the same data in multiple places to avoid joins at read time. The opposite of normalization. Fast reads, complicated updates, stale-looking values in old records.

**Derived data** — Data computed from other data, kept up to date. Search indexes, materialized views, caches, dashboards. The dominant pattern of Part III of the book.

**Distributed transaction** — A transaction spanning multiple databases or services. Hard, slow, fragile. Usually replaced by sagas / eventual consistency in modern systems. See Ch. 9.

**Durability** — Once a write is acknowledged, it survives crashes. Sometimes the system says "Saved" when the data is only buffered. Verify before writing the UI claim. See Ch. 7.

---

## E

**Eventual consistency** — If no new writes happen, eventually all replicas converge. Says nothing about *when*. The weakest useful guarantee. Design implication: any single read may be stale, out of order, or inconsistent with prior reads. See Ch. 5, 9.

**Event sourcing** — Storing every change as an immutable event; current state is derived by replaying events. Unlocks audit, undo, "view as of," time travel. See Ch. 11.

**Event time vs. processing time** — Event time: when the event actually happened (at the source). Processing time: when the stream processor saw it. They disagree, sometimes by hours (offline mobile, retries, delays). See Ch. 11.

**Exactly-once delivery** — Every event is processed exactly once even with failures. Expensive but achievable. If a system promises it and you rely on it, verify the claim.

---

## F

**Failover** — Switching from a failed primary to a backup. Takes seconds to tens of seconds in practice. Visible as a brief "everything is slow" window. See Ch. 5, 8.

**Fault tolerance** — The system keeps working when components fail. Not the absence of faults; the management of them. See Ch. 1.

**Fencing token** — A monotonically increasing number used to detect and reject "I thought I was the leader but I was paused" operations after a failover. Mostly invisible to UI but explains why some failover designs are robust and others corrupt data.

**Forward compatibility** — Old code can read new data. Required when mobile apps in the wild are talking to servers that have already been upgraded. See Ch. 4.

---

## G

**Graph database** — A database where nodes and edges are both first-class. Neo4j is the dominant brand. Good for variable-depth traversals, lateral movement detection, recommendations. See Ch. 2.

---

## H

**Hash partitioning** — Splitting data across nodes by hashing a key. Even distribution, but range queries become expensive. See Ch. 6.

**Hot key / hot partition** — A key or partition receiving disproportionate traffic. The "celebrity problem." Causes one node to bottleneck the whole system. See Ch. 6.

**HLL / HyperLogLog** — An algorithm for approximate distinct counts. "Unique users this month" tiles on dashboards are usually HLL. Honest to surface the approximation when accuracy matters.

---

## I

**Idempotency** — An operation can be applied multiple times with the same result as applying it once. Critical for retry safety. Practical UI consequence: action submissions should include a client-generated idempotency key so backend dedupes. See Ch. 8, 11.

**Index** — A secondary data structure that speeds up reads on a specific field. Every filter, sort, or search field in your UI almost certainly has one. Every index slows writes. See Ch. 3.

**Isolation** — In a transaction, concurrent transactions don't interfere with each other. Strength varies by isolation level. The source of most "two users hit save at once" bugs. See Ch. 7.

---

## J

**Join** — Combining two datasets on a shared key. Cheap in well-indexed relational DBs, expensive across partitions, very expensive across streams. See Ch. 2, 6, 10, 11.

---

## K

**Kafka** — The dominant log-based streaming system. Producers append; consumers read at their own pace; data is retained for days or forever. The substrate for CDC, event sourcing, and most modern data integration. See Ch. 11.

---

## L

**Lambda architecture** — A hybrid pattern: batch jobs produce accurate-but-stale views, streams produce fresh-but-approximate views, the two are merged in the serving layer. Increasingly replaced by "kappa" (streams only, with reprocessing for accuracy).

**Last-write-wins (LWW)** — A conflict resolution strategy: keep the write with the latest timestamp. Simple but lossy. Dangerous when clocks lie (they do). See Ch. 5, 8.

**Lineage** — Where this data came from. Which raw events, which transformations, which derived tables. Modern data tools surface this as a graph. See Ch. 10.

**Linearizability** — The strongest single-key consistency model: the system behaves as if there's one up-to-date copy. Expensive. Required for: balances, inventory, unique-username checks. See Ch. 9.

**Log (write-ahead log, change log, event log)** — An append-only, totally-ordered sequence of records. The recurring substrate of modern systems: WAL inside a database, change log between databases, event log for application architecture.

**LSM tree (Log-Structured Merge tree)** — A write-optimized storage structure. Writes are sequential appends; reads check multiple layers; background "compaction" merges them. Used by Cassandra, RocksDB, LevelDB. Source of "intermittent slow query" symptoms. See Ch. 3.

---

## M

**MapReduce** — The 2004 Google paper that started modern distributed batch processing. Map → shuffle → reduce. Slow by interactive standards but extraordinarily durable. See Ch. 10.

**Materialized view** — A pre-computed query, stored as if it were a table, refreshed periodically. The engine behind "summary tiles that load in 50ms." Trade: instant reads, stale data. See Ch. 3.

**Microservices** — An architecture style where the application is split into many small services. Communicates via APIs or events. Trade: independent deployment, but distributed-systems problems are everywhere now.

**MPP (Massively Parallel Processing)** — A database architecture where queries are split across many nodes and run in parallel. Snowflake, BigQuery, Redshift. See Ch. 6, 10.

**Multi-leader replication** — Replication where two or more nodes can accept writes; they sync to each other. Used for multi-region apps. Conflicts can occur and must be resolved. See Ch. 5.

---

## N

**Node** — A single machine (physical or virtual) in a distributed system.

**Normalization** — Storing each fact in exactly one place, referencing it from elsewhere via keys. Clean updates, expensive reads (joins). Opposite of denormalization.

**NoSQL** — A loose family of databases that depart from the relational model — document stores, key-value stores, graph stores, column stores. The label is mostly marketing; the underlying decisions are the data-model and storage choices in Ch. 2 and 3.

---

## O

**OLAP (Online Analytical Processing)** — Few queries, each touching millions of rows. Dashboards, BI, reports. Different infrastructure from OLTP. See Ch. 3.

**OLTP (Online Transaction Processing)** — Many small operations per second. "Place this order." "Mark this read." Standard operational app workload. See Ch. 3.

**Optimistic concurrency** — Let everyone proceed; check at commit time whether anyone conflicted; reject and retry the losers. Used in SSI, version-stamped editing forms, etc. See Ch. 7.

**Optimistic UI** — Showing the action as succeeded before the server confirms. Faster-feeling, but requires a rollback design when it fails. See Ch. 1, 5.

---

## P

**PACELC** — A more useful framing than CAP: during a Partition, choose Availability or Consistency; Else, choose Latency or Consistency. Captures the latency tradeoff that CAP ignores.

**Partition** — (1) A subset of data on one node when data is split across many. (2) A network failure separating groups of nodes. The two meanings are unrelated. Context disambiguates. See Ch. 6, 9.

**Partitioning** — Splitting data across multiple nodes so the system can hold and serve more than any one machine could. Also called sharding. See Ch. 6.

**Phantom read** — A transaction queries "all rows where X" and gets one set; later in the same transaction, gets a different set because other transactions inserted matching rows. See Ch. 7.

**Polyglot persistence** — Using different databases for different parts of the system: relational for transactions, document for profiles, search engine for search, etc. The norm in mature products. See Ch. 12 / synthesis.

**Protocol Buffers / Protobuf** — Google's binary serialization format with explicit schemas. Compact, fast, evolvable. Common in service-to-service APIs.

---

## Q

**Quorum** — A majority (or other configured fraction) of nodes that must agree for an operation to succeed. The basis of consensus and Dynamo-style reads/writes. See Ch. 5, 9.

---

## R

**Raft** — A consensus algorithm. Simpler to implement than Paxos. Used by etcd, Consul, CockroachDB, others. See Ch. 9.

**Read committed** — An isolation level that prevents reading uncommitted data and dirty writes, but allows non-repeatable reads. Default in Postgres, Oracle, SQL Server. See Ch. 7.

**Read your writes** — A consistency property: after a user writes something, their subsequent reads see it. Surprisingly easy to violate with read replicas; a major source of "I posted that, where did it go?" bugs. See Ch. 5.

**Rebalancing** — Moving partitions between nodes as load changes or nodes fail. Visible as brief periods of slower performance. See Ch. 6.

**Replica** — A copy of the data on another node.

**Replication** — Keeping multiple copies of data on multiple machines. Three architectures: leader-based, multi-leader, leaderless. See Ch. 5.

**Replication lag** — The delay between a write being acknowledged by the leader and showing up on a follower. Source of many UI lies. See Ch. 5.

---

## S

**Saga** — A pattern for multi-step business workflows across services: each step is a local transaction; if a later step fails, earlier steps are "compensated" by reverse operations. Replaces distributed transactions in microservice architectures. UI consequence: actions can be reversed after they look successful. See Ch. 7, 9.

**Schema** — The shape of data: fields, types, relationships. Can be enforced at write time (schema-on-write) or read time (schema-on-read). See Ch. 2, 4.

**Schema evolution** — Adding, removing, renaming fields over time without breaking old data or old clients. See Ch. 4.

**Sequence number** — A server-assigned monotonic integer used to establish total ordering of events. The gold standard for "things must arrive in order." See Ch. 9, 11.

**Serializability** — The strongest isolation level: transactions appear to execute one at a time. Expensive. Required for high-stakes invariants. See Ch. 7.

**Serializable snapshot isolation (SSI)** — A modern, optimistic way to achieve serializability: let transactions proceed, abort the ones that would violate ordering at commit time. Used by Postgres' SERIALIZABLE, CockroachDB. See Ch. 7.

**Sharding** — Synonym for partitioning. See Ch. 6.

**Skew** — Uneven distribution. Skewed keys → hot partitions. Skewed work → some workers finish, others run for hours. The source of many "scales well in benchmarks, fails in production" stories. See Ch. 6.

**Snapshot isolation** — An isolation level where each transaction sees a consistent snapshot of the data as of when it started. Prevents most anomalies but not write skew. See Ch. 7.

**Split brain** — Two nodes both think they're the leader, both accept writes, data diverges. The catastrophic failure mode of bad failover. Fencing tokens prevent it. See Ch. 8, 9.

**SSTable (Sorted String Table)** — A file of sorted key-value pairs, immutable once written. The building block of LSM-tree storage. See Ch. 3.

**Stream processing** — Processing events as they arrive, continuously, without bounds. See Ch. 11.

---

## T

**Tombstone** — A marker indicating a deleted record. The record itself isn't immediately removed; the tombstone is. Eventually compacted away. Sometimes leaks into the UI as "deleted but still showing for a few seconds." See Ch. 3, 5.

**Total order broadcast** — A protocol where every node receives every message in the same order. Equivalent in strength to consensus. The basis of strongly-consistent replication. See Ch. 9.

**Transaction** — A unit of work that is atomic, isolated, and durable. See Ch. 7.

**Two-phase commit (2PC)** — A protocol for atomic commit across multiple nodes. Famous for its blocking failure mode. Largely supplanted by sagas in modern architectures. See Ch. 9.

**Two-phase locking (2PL)** — A protocol for serializable transactions that uses locks. Robust but slow under contention. See Ch. 7.

---

## V

**Vector clock** — A data structure for tracking causality across nodes. Used by Dynamo-style stores to detect concurrent writes. The mechanism behind "this object has two competing versions, please reconcile" UIs.

---

## W

**Warehouse** — See "data warehouse."

**Watermark** — In stream processing, a heuristic boundary that says "we're done with events up to this point; late events will be handled separately." Defines when a window is "closed." See Ch. 11.

**Window** — A time-bounded slice of an event stream for aggregation. Tumbling, sliding, session. See Ch. 11.

**Write skew** — A concurrency anomaly where two transactions each individually preserve invariants based on what they read, but their combined effect violates the invariant. Not prevented by snapshot isolation. The most underrated bug pattern in this space. See Ch. 7.

---

## Z

**ZooKeeper / etcd** — Coordination services backed by consensus. Hold ground truth for leader election, distributed locks, service discovery, configuration. When they pause, dependent services often pause too. See Ch. 9.

---

# patterns

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

---


# Chapter 1 — Reliable, Scalable, Maintainable Applications

## The frame

Before the book talks about databases or distributed systems, it sets up three properties that every data-intensive system is judged against — and they're constantly in tension:

- **Reliability** — the system keeps working correctly even when things go wrong.
- **Scalability** — performance stays acceptable as load grows.
- **Maintainability** — the next team that touches it can still ship.

For a designer, the move is to notice that PMs and engineers almost always conflate these. "Make it more scalable" can mean any of the three, and the UI response is different for each.

## Reliability — designing for when things break

Faults are not edge cases. Hardware dies, software has bugs, humans misclick. A "reliable" system isn't fault-free — it's *fault-tolerant*: it expects faults and handles them gracefully.

For the screen, this means:
- **Empty, loading, partial, and error states are first-class designs**, not afterthoughts. The product spends real percentage of its life in those states.
- **"Optimistic UI" needs a rollback story.** If you show the action as succeeded and it later fails, what does the user see — a toast, an inline revert, a modal? Decide before shipping, not in QA.
- **Human errors are the dominant fault mode.** Most production incidents trace back to someone pressing the wrong button. This is a UI problem. Confirmation modals for destructive actions, undo windows for reversible ones, and "are you in production?" environment chrome are all reliability features.

A useful distinction: there are faults the user should see (their action failed, retry), faults the system should hide (one replica went down, the request was retried transparently), and faults the user only sees in aggregate (the system is degraded, show a banner). Each one is a different design.

## Scalability — designing for growth

The book is careful: "scalable" is not a property, it's a question. *Scalable in what dimension, against what load?*

Two concepts the designer needs:

**Load parameters** — how you describe what the system is being asked to do. Tweets per second is one; the *distribution* of followers per user is another, and it's the harder one. (Twitter's fan-out problem: a celebrity tweet hits 100M timelines; an average tweet hits 200. The shape of the load, not the volume, dictates the architecture.) For your designs, the load parameter that matters is rarely "users" — it's usually a structural number like "average notifications per user per day," "active filters per dashboard," "open tabs per session," or "alerts per SOC analyst per hour." Surface those numbers in your specs.

**Latency vs. throughput, and the tail.** Average latency is a lie. The thing that destroys UX is the 99th percentile — the slowest 1% of requests. If your product is used heavily by power users (and most B2B products are), those users disproportionately experience the tail. A "fast" backend can still feel terrible because every dashboard the power user opens hits at least one slow request, and one slow request blocks the screen.

Design implications:
- **Skeleton states for everything that loads.** Not spinners. Skeletons signal shape, which feels faster.
- **Progressive disclosure of data.** Show the cheap things first; let the expensive things stream in. A dashboard with 12 panels should not block on the slowest panel.
- **Don't let a single slow widget kill the page.** Each panel owns its own loading/error state.
- **"Refresh" is a verb the user understands.** "Eventually consistent" is not. When freshness matters, give them a refresh affordance and a last-updated timestamp.

## Maintainability — designing for the team that inherits this

Most software cost is not the first build; it's everything after. The book breaks maintainability into three:

- **Operability** — can ops keep this running?
- **Simplicity** — can a new engineer understand it?
- **Evolvability** — can it change without rewriting from scratch?

The design-relevant one is **evolvability**. Every product you design will outlive the design system you designed it in. The features you ship today will be modified, deprecated, hidden behind flags, A/B tested, and eventually removed by someone who doesn't know why they exist.

Practical translations:
- **Document the *why*, not just the *what*, in your design files.** Acceptance criteria rot. Intent doesn't.
- **Component variants beat one-off screens.** Every one-off you ship is a maintenance liability for the next designer.
- **Empty states that explain the feature are evolvability tools.** They onboard new users *and* future teammates who open the screen with no data and wonder what it does.
- **Avoid coupling the visual design to specific data shapes that haven't stabilized.** If the API contract is still in flux, design with placeholders that survive the rename.

## What a designer should take from this chapter

Three habits:

1. **When someone says "reliable" or "scalable" or "maintainable," ask which one and against what.** The words mean different things to backend, frontend, ops, and product.
2. **Design the unhappy paths before the happy path is signed off.** Loading, empty, error, partial, conflict, offline, rate-limited, permission-denied — name them all, sketch them all.
3. **Surface the load parameters that actually shape the experience** in your specs. "10 users" tells the engineer nothing. "10 users, each with 40 saved filters, each filter touching ~5,000 rows, refreshed every 30s" is a brief.

## Connections forward

- The reliability theme returns in Chapter 8 (distributed systems' specific failure modes) and Chapter 9 (what consistency you can actually promise).
- The scalability theme drives Chapter 5 (replication), Chapter 6 (partitioning), and Chapter 11 (streaming).
- Maintainability shows up sharpest in Chapter 4 (schema evolution — the engineering side of "this product will change").

---


# Chapter 2 — Data Models and Query Languages

## The frame

The data model is the deepest decision in a system. Everything sitting on top of it — the API, the UI, the IA, what's easy and what's nearly impossible — inherits its shape. The book walks three families: relational, document, and graph, plus how you query each.

For a designer, the takeaway is unglamorous but load-bearing: **the data model is the silent constraint on every screen you'll ever ship for this product**. Most "weird" UI compromises — the dropdown that's empty, the filter that doesn't combine with that other filter, the dashboard that takes 8 seconds — trace back to a data-model decision made before you arrived.

## The three families

### Relational (tables, rows, foreign keys)
The classical model: data lives in tables, relationships are foreign keys, queries are SQL joins. Strong at: ad-hoc queries, multi-entity reports, integrity constraints. Weak at: deeply nested or tree-shaped data, where every join is a tax.

UI signal you're on relational: lots of cross-entity filters work, "show me X grouped by Y filtered by Z" works, but a single user profile takes 7 queries to assemble.

### Document (JSON-like nested trees)
One document = one logical entity, with everything it owns nested inside. Think MongoDB, CouchDB, DynamoDB-style. Strong at: locality (load the whole entity in one fetch), schema flexibility, mapping to objects in code. Weak at: querying *across* documents, many-to-many relationships, and joins.

UI signal you're on document: profile screens are blazing fast, but "show me all users who like X" requires either a separate index or a slow scan.

### Graph (nodes and edges, both first-class)
Relationships are the point. Think Neo4j, RDF/SPARQL stores, social graphs, knowledge graphs. Strong at: variable-depth traversals ("everyone who reports to X, transitively"), recommendation paths, network analysis. Weak at: bulk aggregations, "give me a table" reports.

UI signal you're on graph: anything shaped like "second-degree connection," "shortest path," "find me a node N hops away from this one."

## The object-relational mismatch (and why your profile screen is the way it is)

The book spends real estate on the awkwardness of mapping rich application objects (a user with addresses, contact methods, skills, employment history, education...) into flat tables. The relational answer is normalization: many tables, joined back together at read time. The document answer is to keep the whole thing as one nested blob.

Each choice has a UI cost.

**Normalized (relational):** updates are clean (change the company name once, it propagates everywhere), but reading a profile assembles 6 queries. A "previous employers" autocomplete is trivial because the company is a separate entity. But if the engineer is fighting query performance, you'll feel it on every screen.

**Denormalized (document):** the profile loads as one fat blob — fast. But if a user changes their name, that name is duplicated across every comment, post, and audit log it appears in, and "fix them all" becomes a batch job. Stale names in old comments are not a bug; they're an architectural choice.

This duality recurs everywhere — chat apps, e-commerce, social products, CRM. **Whenever a designer notices stale-looking values in old records, that's almost always denormalization, not laziness.**

## Many-to-many is where models break

One-to-many (a user has many posts) is easy in every model. Many-to-many (users follow users, products belong to categories, tags belong to articles) is where the model choice starts to bite:

- Relational: a join table. Solid, slightly verbose.
- Document: either embed (and duplicate) or fall back to references that you join in application code (and lose the document model's main advantage).
- Graph: trivial. This is what graph databases are *for*.

UI consequence: any feature involving "people who...", "tags that...", "related to..." is a many-to-many feature. If those features feel slow or limited, ask the engineer which model is underneath. A document store doing many-to-many in application code will always feel that way.

## Schema-on-write vs. schema-on-read

The book pushes back on the "schemaless" framing for document stores. There's still a schema — it's just enforced when the code reads the data, not when it's written. The shape lives in the application, not the database.

Design implications:
- **In schema-on-read systems, your UI is the schema enforcer.** If the form lets the user save a record without a required field, nothing else will catch it. Validation is not cosmetic — it's the integrity layer.
- **Old records may have any historical shape.** A 5-year-old record won't have the fields you added last sprint. Empty/missing states are not edge cases; they're the modal case for legacy data. Design for it.
- **Migrations are a UX event.** When the team adds a required field, every old record is suddenly "incomplete." That has to surface honestly — not as a silent broken state.

## Query languages — declarative vs. imperative

SQL is *declarative*: you describe what you want, the database figures out how. MapReduce-style or imperative code is the opposite: you tell the machine how to do it, step by step.

The designer-relevant point: **declarative query languages are why filter/sort/group UIs work.** When the user composes filters in a UI, that UI builds a declarative query, and the database picks an efficient plan. If the underlying API is imperative (procedural endpoints, GraphQL resolvers that hand-code each path), the UI's filter combinations are constrained to the ones the engineer pre-built.

The "why can't I combine these two filters?" question, ninety percent of the time, is the API being less expressive than the database underneath.

## Graph data and the questions only graphs answer well

The chapter introduces property graphs (nodes + labeled edges + properties on both), the Cypher query language (Neo4j), graph queries forced into SQL (painful), and triple-stores / SPARQL.

The screens that *want* a graph model:
- "Mutual connections" panels
- Org charts with reporting chains of arbitrary depth
- "Why am I seeing this?" lineage / provenance views
- Knowledge graph explorers (cyber threat intel, drug interactions, fraud rings)
- Recommendation explanations ("because you and they both...")

If a brief calls for any of these and the backend is a vanilla relational store, expect either heroic SQL with recursive CTEs (slow, fragile) or a hand-built materialized view that doesn't update in real time.

## What a designer should take from this chapter

1. **Ask which family the backend is** before designing anything with relationships in it. The screens that are cheap and the screens that are catastrophic are different in each family.
2. **Treat "stale-looking values in old records" as an architectural signal, not a bug to log.** Then design around it (e.g., display denormalized names with a hover that fetches the canonical one).
3. **The form is the schema** in document/schema-on-read systems. Validation is not a polish task.
4. **Many-to-many features are budget items.** Treat them as such in scoping.

## Connections forward

- Storage internals for these models → Chapter 3.
- How the data shape *evolves* as the product evolves → Chapter 4 (encoding & schemas).
- What happens to these models when you spread them across many machines → Chapter 5 (replication), Chapter 6 (partitioning).

---


# Chapter 3 — Storage and Retrieval

## The frame

Two questions: how does a database store the data you give it, and how does it find it again later? The choice the engineering team made — sometimes years ago, often inherited from a default — sets a hard ceiling on what kinds of screens are fast and what kinds are slow.

The chapter splits the world along two axes: how data is laid out on disk (log-structured vs. page-oriented), and what the workload looks like (transactional / OLTP vs. analytical / OLAP).

For a designer, this chapter is the source of most "why is this list/dashboard slow?" answers.

## Indexes — what they are, why every one costs you

An index is a secondary data structure that makes reads fast. Every field you can filter, sort, or search on quickly in the UI almost certainly has an index behind it.

The trade is fixed and ruthless: **every index speeds up reads but slows down writes**, and every index takes storage. When the engineer says "we can't add a filter for that field," they often mean "that field isn't indexed, and adding the index would hurt write performance for everyone."

UI implications:
- **Filter chips and sortable columns are not free.** Each one is a backend decision someone made.
- **"Add a filter for X" is rarely a UI ticket.** It's an index, a migration, and possibly a backfill.
- **Search fields against unindexed columns are LIES.** They will either be slow or quietly fall back to fuzzy/partial matching that's not what the user expected.

## Log-structured (LSM trees, SSTables) vs. page-oriented (B-trees)

Two ways databases organize data on disk:

**B-trees** (Postgres, MySQL InnoDB, most "classical" databases). Update in place. Reads and writes are both balanced; predictable performance. Slightly worse on heavy write workloads.

**LSM trees / log-structured** (Cassandra, RocksDB, HBase, LevelDB-style). Writes are sequential appends — *very* fast. Reads may need to check multiple layers and are amortized by background "compaction." Compaction is the source of mysterious latency spikes.

UI tells:
- **Write-heavy products on LSM** (chat ingestion, telemetry, event logging) feel snappy on the write path but can have occasional "everything got slow for 30 seconds" episodes. Design the UI to be honest about it — show a "syncing" or "catching up" affordance rather than pretending it's instant.
- **B-tree systems** have more uniform behavior. If your dashboard suddenly slows down, it's usually a single bad query, not a compaction storm.

You don't need to know which one is underneath, but if the engineering team mentions "compaction," "tombstones," or "bloom filters," you're on LSM, and intermittent latency is in the cards.

## OLTP vs. OLAP — the two workloads

This is the single most important slide in this chapter for designers.

**OLTP (transaction processing)** — what a normal app does. Many small operations per second, each touching a few rows. "Place this order." "Update this profile." "Mark this alert as read." Low latency required, freshness is critical.

**OLAP (analytical processing)** — what a dashboard or BI tool does. Few queries per second, each touching millions of rows. "Total revenue by region by month for the last 3 years." High throughput required, freshness can be hours-old.

These two workloads do not coexist well on the same database. The standard pattern is: OLTP database is the source of truth; data is periodically copied (ETL'd) into an OLAP system (a data warehouse) where the dashboards live.

**This is the reason your "real-time dashboard" is not real-time.** It's usually pointed at the warehouse, which is hours behind. If the brief says "real-time," ask: real-time against what? Against the source-of-truth DB (expensive, requires special architecture) or against the warehouse (cheaper, but lagged)?

Implications for your designs:
- **Always show a "data as of" timestamp on analytical screens.** Always.
- **"Live" tiles and "trend over time" charts often live on different infrastructure.** A single dashboard can mix freshness sources — call it out in the design.
- **Filters on operational fields work; filters on derived analytics fields are pre-aggregated and limited.** A filter for "user country" might be free; a filter for "users with churn risk > 0.7" might require regenerating the whole cube.

## Star and snowflake schemas — what BI dashboards actually run on

Analytical databases use a specific shape: a big central "fact" table (every event, every order, every transaction — the things that happened) surrounded by small "dimension" tables (the things events are about: users, products, regions, dates).

This is why BI tools all look the same. Tableau, Looker, Power BI, every internal BI dashboard ever — they all share a vocabulary of "measures" (numbers from the fact table, aggregated) and "dimensions" (the slice-by axes). Once you see it, you can't unsee it.

Design implications:
- **A "dashboard" interface is implicitly a star schema browser.** Your sidebar filters = dimensions. Your tiles = measures. Layouts that fight this are confusing because they fight the data shape.
- **Drill-downs follow dimension hierarchies** (year → quarter → month → day; country → region → city). If the user can't drill down through what feels like a natural hierarchy, it's because that dimension wasn't modeled hierarchically.
- **"Add a custom measure" features are deceptively heavy.** Each new measure may require warehouse changes.

## Column-oriented storage — the trick behind fast analytics

OLAP systems store data by column, not by row. A query like "sum of revenue across 100M orders" reads only the revenue column — one tight, compressed stream — instead of every byte of every order. This is why a column store can scan a billion rows in seconds while a row store would take hours.

Designer-relevant consequences:
- **Wide tables in BI are not expensive in the way you'd think.** Adding a column to a table is cheap to query; adding rows is what costs.
- **"Pick any 3 of these 40 dimensions and slice" is feasible** on column stores in a way it isn't on row stores. The UX of multi-faceted exploration is unlocked by the storage model.
- **Sort order in the underlying data affects query speed.** "Recent first" is often free; "alphabetical" might require a full re-sort.

## Materialized views and data cubes

A materialized view = a pre-computed query, stored as if it were a table, refreshed periodically. A data cube = the same idea taken further: pre-aggregate across every interesting combination of dimensions.

The killer property: queries become instant, *but* the data is only as fresh as the last refresh.

This is the engine behind every "summary tile that loads in 50ms" you've ever designed. It's also why those summary tiles sometimes disagree with the detailed view below them: the summary is from a 4-hour-old materialized view; the detail is live.

**Design move:** when a header tile and a detail table disagree, the user notices. Show a unified freshness timestamp at the dashboard level, or pin both to the same refresh cadence.

## What a designer should take from this chapter

1. **Every filter, sort, and search field rests on an index. Indexes have cost. Don't add them casually.**
2. **OLTP and OLAP are different worlds.** "Real-time dashboard" needs a definition. Almost always, dashboards run on stale-but-fast analytical infrastructure.
3. **Dashboards are star schemas.** Design with that vocabulary (dimensions, measures, hierarchies) and your dashboards will compose better.
4. **Disagreements between summary and detail are a freshness problem, not a bug.** Surface freshness, don't hide it.

## Connections forward

- How data gets from OLTP to OLAP → Chapter 10 (batch) and Chapter 11 (streams / CDC).
- Why the same dashboard can show different numbers on different replicas → Chapter 5.
- Why a query that's fast for one tenant is slow for another → Chapter 6 (partitioning, hot keys).

---


# Chapter 4 — Encoding and Evolution

## The frame

Code changes. Data outlives the code. Yesterday's records are still in your database when today's deploy ships, and tomorrow's deploy will still need to read them. This chapter is about the formats data is encoded in (JSON, XML, Protocol Buffers, Avro, Thrift) and — more importantly for designers — how systems handle the fact that the *shape* of data evolves over time while old data remains.

For a designer, this is the engineering side of "products are never finished." Every field you add, every label you rename, every dropdown you expand into a new entity — that's a schema evolution event, and old records, old clients, and old caches are all going to react.

## Encoding formats — the short version

The chapter walks several encoding families:

- **Language-specific** (Python pickle, Java serialization). Avoid for anything crossing a process boundary. Brittle, insecure, hard to evolve.
- **Textual / human-readable** (JSON, XML, CSV). Universal, debuggable, verbose. JSON has known gotchas (number precision, no native dates, ambiguity about whether a missing field means "absent" or "null").
- **Binary schemas** (Thrift, Protocol Buffers, Avro). Compact, fast, strict. The schema is a separate artifact — you can evolve it deliberately. This is what most large systems use internally.

The format choice rarely shows up in the UI directly, but it shapes one thing that does: **how forgiving the system is when fields are added, removed, or renamed.** Binary-schema formats with explicit versioning evolve gracefully; ad-hoc JSON evolves by accident, with bugs.

## Forward and backward compatibility — the two directions

This is the concept to internalize.

- **Backward compatibility** — *new code can read old data*. Yesterday's records still work after today's deploy.
- **Forward compatibility** — *old code can read new data*. The old mobile app still works after the server adds a field.

Both matter, and they constrain different things. A field you add today must not break old clients that don't know about it (forward). A field you remove today must still be tolerated when reading old records that still have it (backward).

For a UI designer, the rules of thumb that fall out of this:

- **Never make a new field required for users until every old record has been backfilled.** Otherwise, every old record renders as "incomplete" — a sudden mass-broken state.
- **Old clients will keep running for months.** Mobile apps in particular. Removing a field from the API breaks every version of the app that hasn't updated. Design migrations as gradual deprecations, not sudden removals.
- **Renames are deletes plus inserts.** "Status" → "State" is two fields existing simultaneously for a long time. Plan the UI for that overlap.

## Schemas as a UI contract

When the engineering team uses a schema-driven format (Protobuf, Avro), there is an explicit, versioned definition of every field. This is gold for designers: you can read it, you can reference it, you can argue with it.

When the team uses ad-hoc JSON with no schema, the "schema" is whatever the most recent endpoint happens to return. The UI is the only enforcer. Every change is a small risk of silent breakage.

**Design move:** ask the team early what the contract format is. If there's no schema, push for one even informally — an OpenAPI/Swagger spec, a TypeScript interface, anything. It will save you on every redesign.

## How data actually moves between systems — the three modes

The chapter lists three patterns for how encoded data flows. Each has a UX shape.

### 1. Through databases (write now, read later)
Data written today is read by code that doesn't exist yet. This is the longest-running compatibility problem in any product — records from 2018 still sit in the DB, and the UI has to render them.

UX consequences:
- The "old data, new UI" case is the dominant case for legacy systems. Design for it.
- Backfills (rewriting old records to match a new schema) are major operations. They get scheduled, sometimes never happen, and partial backfills mean "some records have the new field, some don't."
- Historical detail views are where this bites hardest. A user opens an order from 3 years ago and the screen has to render it gracefully even though half the fields you designed for don't exist.

### 2. Through services / RPC / REST (request-response)
Service A calls service B. Both are evolving independently. The contract between them is the API.

UX consequences:
- API versioning leaks. "v1," "v2" in the URL, deprecation notices, sunset dates — these often need user-facing surfacing in admin tools and integrator-facing products.
- Optional fields are negotiations. "We added `priority` to the response" only helps if the client knows to ask for it. Old clients ignore it, new clients show it — your design needs to work with and without.

### 3. Through messages / async (publish, somebody consumes later, maybe)
Service A drops a message; service B picks it up. The two are decoupled in time. Often B is many services, including ones you don't control.

UX consequences:
- Async actions need optimistic UI with rollback. The user hits "send" and you can't realistically wait for every downstream consumer to process.
- "It happened" and "everyone knows it happened" are different moments. A status of "Submitted" is honest; "Completed" is a lie if downstream consumers haven't finished. (This is the seed of event sourcing — see Chapter 11.)

## Avro and dynamic schemas — relevant for analytics tools

Avro's twist is that the schema is shipped *with* the data, and a reader can be given any version of the schema and still parse the file. This is the format underneath a lot of analytics pipelines (Kafka, Hadoop, Snowflake imports).

The designer-relevant consequence: **analytics dashboards built on Avro-based pipelines can handle schema drift gracefully.** Adding a new field upstream doesn't break the dashboard — it just becomes available. Removing a field doesn't break old reports — they still parse. If the team is using Avro, your dashboards inherit some of this forgiveness.

If they're using ad-hoc JSON dumps into a data lake, schema drift is your problem to handle in the UI. Expect ghost columns, missing values, and "this report worked last month" tickets.

## What a designer should take from this chapter

1. **Old data is the modal case, not the edge case.** Most records in any mature system predate your current designs. Render them gracefully.
2. **New required fields are migration events.** Plan how old records will be filled, surfaced, or shown as "needs attention" before the change goes live.
3. **API versioning is sometimes a user-facing concern.** Admin consoles, integrator portals, and developer tools all need to show it explicitly.
4. **Async actions need honest status states.** "Submitted" ≠ "Done." Don't conflate them in the UI.
5. **If there's no schema, the form is the schema.** Validate accordingly.

## Connections forward

- The async / message pattern explodes into a major theme in Chapter 11 (stream processing) — event sourcing, CDC, log compaction all live there.
- The "old data, new code" problem is what makes batch processing (Chapter 10) so useful: you can re-derive your read models from raw events, fixing historical inconsistencies in one pass.
- The "service-to-service contract" theme connects to the discussion of partial failures in Chapter 8 — async messaging is partly a response to "what if the other service is just gone?"

---


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

---


# Chapter 6 — Partitioning (Sharding)

## The frame

Replication makes copies; partitioning splits the data into pieces. Each piece (partition, shard) lives on a different node. Together they let a single logical "database" hold more data and serve more load than any single machine could.

For a designer, this chapter is the source of two recurring categories of weirdness: **"hot tenant" problems** (one customer makes the whole product slow for everyone) and **"global query" cliffs** (most screens are fast, but a few specific screens take 30 seconds because they need to scan every partition).

## How data gets partitioned — two strategies

### Range-based partitioning
Split by ranges of the key — partition 1 holds A–F, partition 2 holds G–M, etc.

Pros: range queries are cheap ("everything from last week," "all users starting with B").
Cons: data is unevenly distributed if the key distribution is skewed — and it usually is. Time-based keys are notorious: today's partition gets all the writes, yesterday's gets all the reads.

### Hash-based partitioning
Hash the key, partition by the hash. Distribution is even.

Pros: load is spread evenly. No hot spots from skewed keys.
Cons: range queries are dead. "Everything from last week" now has to query every partition.

### Combined
Some systems hash the high-order key and range-partition within it (Cassandra's clustering key idea). You get even tenant distribution *and* range queries within a tenant. This is the dominant pattern in modern multi-tenant systems.

UI tells:
- **Per-tenant or per-user views are usually cheap.** That's what the partitioning was optimized for.
- **Cross-tenant or cross-user views can be catastrophic.** "Admin: show me the top 100 actions across all customers" might require fanning out to every partition and merging results — which is exactly what you don't want a dashboard to do.

## Hot keys and skewed workloads — the celebrity problem

Even perfect partitioning can't save you if one key is far more popular than the others. The classic example: a celebrity on Twitter. Their tweets, their mentions, their followers — all pile onto one partition. That partition's node is now the bottleneck for the whole system.

In Triolla's verticals you'll meet this as:
- **Cyber:** one ultra-noisy asset or sensor generating 90% of events.
- **Fintech:** one merchant or one high-volume trader producing most of the transactions.
- **Health:** one big hospital network as a single tenant on a SaaS.
- **BI:** one user with a giant saved query that runs every minute.

Engineering mitigations exist (splitting the hot key with a random suffix, caching, separate infrastructure for whales), but they're not free.

**Design moves:**
- For B2B products, surface "per-tenant usage" telemetry to ops/admin UIs — let admins see who's saturating things.
- Throttle, rate-limit, and queue user-facing async actions for power users. Show queue position rather than pretending it'll be instant.
- For real-time feeds with potential floods, allow user-side filtering ("hide events from this asset") *before* the data hits the screen, not just after.

## Secondary indexes and partitioning — where queries get complicated

Partitioning by the primary key is easy. The trouble starts when you want to query by *something else*. There are two ways to handle secondary indexes across partitions:

### Local secondary index (partitioned by document)
Each partition maintains its own index over its own data. A query has to fan out to every partition, get partial results, and merge. Cheap to write, expensive to query.

### Global secondary index (partitioned by term)
The index itself is partitioned by the indexed value. A query goes to one partition for results. Cheap to query, expensive to write (each write may need to update an index entry on a different node — potentially with cross-partition coordination).

UI consequences:
- **Filters and searches on non-primary fields have a cost the engineer chose.** Local index = the query is slow for everyone. Global index = the write was slow for whoever made it. Both feel different.
- **Sometimes a search field in a UI is silently powered by a totally separate system** — Elasticsearch, Solr, or an analytics engine — because doing it in the primary DB was too expensive. That separate system has its own lag, its own consistency model, and its own failure modes. Ask which system answers each search box.

## Rebalancing — when partitions move

As load grows, you add nodes. As nodes fail, partitions move to other nodes. This is rebalancing, and it happens in production.

Three approaches:
- **Fixed number of partitions** (way more than nodes). Easy to move partitions around; can't change the count later. Common.
- **Dynamic partitioning** (splits / merges as data grows). Used by HBase, MongoDB.
- **Partition proportional to nodes.** Cassandra-style.

Designer-relevant consequence: **during rebalancing, the system is briefly under more load and a little slower.** If your product has visible performance characteristics, rebalances may show up as a "things were slow last Tuesday" report. Not a UI bug; an operational reality.

## Request routing — how the client finds the right partition

When the user types in a search or clicks a record, *something* has to know which partition holds the answer. This is request routing, and it's done in one of three ways:
- Client knows the partition map and goes direct.
- A routing tier sits in front and forwards requests.
- Any node knows how to forward to the right one.

The designer-relevant version: **API gateways and routing tiers add latency.** They're often where rate limits, auth checks, and tenant resolution happen. If your UI is making many small parallel requests, each one pays the routing tax. Batch where you can. (This is one of the reasons GraphQL exists, and one of the reasons it sometimes makes things worse — a single big query that joins across partitions can be slower than several small focused ones.)

## Parallel query execution

Analytical databases (MPP — massively parallel processing — engines like Snowflake, Redshift, BigQuery, Spark) deliberately partition data and then *parallel-scan* across partitions for big analytical queries. The whole point is to make a query that scans a billion rows finish in seconds by doing it across 100 machines at once.

The catch: queries that can't be parallelized well (highly skewed joins, single-key lookups masquerading as scans) don't benefit and may even be slower than a single-machine database would have been.

Design-relevant tells:
- **"Add a filter for X" on a BI tool against an MPP engine** is usually cheap because parallel filters fan out and merge.
- **"Sort the whole result set globally" is expensive.** Sorting across partitions requires a coordination step. If pagination on a large result set is sluggish, that's often the cause.
- **`COUNT(*) DISTINCT` is the slowest query you've never noticed.** Distinct counts across partitions are notoriously expensive. If your dashboard has a tile showing "unique users this month," it may either be slow or be approximate (HyperLogLog-style). Both are fine; the design should be honest about which.

## What a designer should take from this chapter

1. **Per-tenant views are cheap; cross-tenant views can be catastrophic.** Design admin/global views with that asymmetry in mind.
2. **Hot keys are a real operational problem** — design for the existence of whales (queue UI, rate limits, per-tenant telemetry, throttling indicators).
3. **Search and filter on non-primary fields are not free.** They're powered by indexes (with write cost) or separate systems (with their own lag). Ask which.
4. **Some metrics on dashboards are approximate by design** (distinct counts, percentiles, top-N at scale). Approximation isn't sloppy — it's the only way the tile can load in under a second. Surface this honestly when accuracy matters.

## Connections forward

- Partitioning + replication interact: each partition has multiple replicas, and the discussions in Chapter 5 apply to each partition independently.
- The "cross-partition coordination" problem is what makes Chapter 7 (transactions) and Chapter 9 (consensus) so important — and so painful at scale.
- The fan-out-and-merge pattern shows up again in batch processing (Chapter 10) — MapReduce is essentially "fan-out-and-merge as a programming model."

---


# Chapter 7 — Transactions

## The frame

A transaction is a way to group several operations into a unit that either all succeeds or all fails — no half-states. Banking is the canonical example: move $100 from account A to account B = subtract from A *and* add to B, atomically, or neither.

But the chapter's real argument is more interesting: transactions look like a single simple guarantee from the outside, and inside they hide a whole spectrum of *isolation levels* — and the level the engineer chose dictates what kinds of UI race conditions are possible.

For a designer, the takeaway is: **most "two users hit the button at once" bugs are isolation bugs in disguise**, and the fix is sometimes a backend tightening and sometimes a UI move (disable button, lock the row, optimistic concurrency token).

## ACID — what it means, and what it doesn't

ACID has become a marketing word. The book argues it has four real meanings, and not all databases that claim ACID mean all four.

- **Atomicity:** all-or-nothing within one transaction. Either every change happens or none does. This is the one most people think of when they hear "transaction." It's about *failure handling*, not concurrency.
- **Consistency:** application-defined invariants stay true (e.g., balances never negative). This is mostly the application's job, not the database's, despite the name.
- **Isolation:** concurrent transactions don't interfere with each other. This is the one with all the gotchas.
- **Durability:** once committed, the data won't be lost (even on crash).

The designer-relevant ones are A, I, and D. The acronym is misleading; pay attention to atomicity (failure), isolation (concurrency), and durability (the "Saved" claim).

## Single-object vs. multi-object operations

A single-object write ("update this row") is atomic in basically every database. Where things get hard is **multi-object operations** — transactions that touch multiple rows, multiple tables, or multiple services.

Multi-object atomicity matters when:
- You move money (debit one row, credit another).
- You delete a user and their associated records.
- You update an order and decrement inventory.

Outside of relational databases with strict transactions, many systems don't give you this. NoSQL document stores often only guarantee atomicity within a single document. Microservice architectures explicitly don't — service A and service B each have their own transactions, and there's no "both or neither" across them. Engineers either accept eventual consistency or build sagas (compensating transactions on failure).

**Design moves:**
- For multi-step user actions that the engineer says "can fail halfway" — design the partial-failure UI. "Your order was placed but inventory couldn't be reserved" is a real state.
- For destructive actions (delete user + delete their data + revoke their access), the user mental model is "this all happens together." If the backend can't guarantee that, the UI needs to handle partial deletes gracefully (retry options, "still cleaning up" indicators).
- Saga patterns leak: an action that seemed to succeed can be compensated (effectively un-done) later by the system. If that's possible, the UI needs language for it — "rolled back," "reversed," "compensated."

## Isolation levels — the spectrum of "weak" to "strong"

Two transactions running at the same time can interact in surprising ways. Isolation levels are the contract for which of those interactions the database will prevent.

From weakest to strongest, the levels and the anomalies they allow:

### Read uncommitted
Reads can see uncommitted changes from other transactions. Almost never used; just listed for completeness.

### Read committed (the default on Postgres, Oracle, SQL Server)
You never see uncommitted data, and you never see your own dirty writes overwriting someone else's. But: you can read different values from the same row at different points in the *same* transaction, because other transactions are committing in between. ("Non-repeatable reads.")

UI consequence: a screen that fetches data in stages (header, then detail, then sidebar) can show internally inconsistent snapshots — the header has the old name, the sidebar has the new one. The fix is usually one read at a higher isolation level or one fetch on the client.

### Snapshot isolation / repeatable read (default on MySQL InnoDB)
Each transaction sees a consistent snapshot of the database as it existed at the moment the transaction started. Strong; prevents most anomalies.

But it doesn't prevent **write skew** (see below) — the most subtle and most underrated concurrency bug.

### Serializable
Transactions behave as if they ran one at a time, in some order. The strongest guarantee. Implemented via two-phase locking (slow), serializable snapshot isolation / SSI (modern, faster), or actual serial execution (Redis-style, single-threaded).

Expensive but correct. For financial cores, identity systems, and anything regulated, this is what you want.

## The three concurrency bugs to actually understand

### Lost updates
Two users read the same value, both modify it, both write it back. The second write silently destroys the first.

Classic case: a user opens an edit form, another user does the same, both save. Whoever saves second wins; whoever saves first has their edit silently erased.

**UI fixes:**
- Optimistic concurrency: include a version number / etag with the form data. When saving, the server rejects the save if the version has moved on. UI shows a "this was edited by someone else — review and merge" flow.
- Pessimistic locking: when the user opens the edit form, mark the record as locked, show other users "Yuval is editing this." (Used by Linear, JIRA-style tools.)
- Field-level merge: only the fields the user changed are sent in the patch, so two concurrent edits to different fields don't conflict.

### Write skew
Two users each read some data, each makes a decision based on what they saw, each writes a change. Individually, each change is fine. Together, they violate a rule that the application *thought* was being enforced.

Classic example: a hospital rule says "at least one doctor must be on call." Two doctors are on call. Both decide to go home, both check ("am I the only one? no, the other is on call, I can leave"), both update their status to off. Now zero doctors are on call. Each transaction was consistent with what it saw; together they broke the invariant.

This is *not* prevented by snapshot isolation. Only serializable does. It's also the bug pattern that's most often missed in code review.

**Where designers meet this:**
- "Only one of these can be active at a time" toggles across many user sessions.
- Capacity-limited selections (seat assignment, slot booking, inventory).
- Approval workflows where multiple approvers can each independently approve "the last one needed."

**UI moves:**
- Optimistic concurrency at minimum.
- For high-stakes invariants, ask the engineer if the operation is truly serializable. If not, you'll see write skew in production.
- Show real-time state in shared screens (other approvers' positions, current seat selections) — make the invariant visible to users so they don't unknowingly race each other.

### Phantom reads
A transaction queries "all rows where X" and gets one set; later in the same transaction, the same query returns more rows because another transaction inserted them. Mostly a backend concern, but can leak into "I see different counts at different parts of the same workflow" bugs.

## Materializing conflicts (the design pattern)

A useful technique the book describes: if you can't get serializable isolation for free, you can sometimes engineer the conflict to become visible by creating a "lock row" that all relevant transactions must update. Two transactions racing for the same slot both try to update the same lock row, and one fails.

For designers, the takeaway is that **the engineer may need a place to "claim" exclusivity, and that claim has UX**. Reservation systems show "you have 8 minutes to complete checkout" because the seat is materially locked for that window. The countdown isn't decoration — it's the UI of a transactional concept.

## Two-phase locking, serial execution, SSI — what they mean for UX

You don't need the algorithms, but the practical UX shapes are:

- **Two-phase locking (2PL):** classic, but transactions block each other. Long-running transactions stall short ones. UI tells: occasional "loading" spinners on otherwise-fast operations because they're queued behind a slow transaction.
- **Actual serial execution:** transactions run one at a time, single-threaded. Surprisingly fast in memory (Redis, VoltDB, Datomic). Constraint: every transaction must be short and known in advance — no waiting for user input. UI tell: the system supports complex "stored procedure"-style multi-step operations sent as a single batch from the UI.
- **Serializable snapshot isolation (SSI):** optimistic — transactions proceed concurrently, but at commit time the system aborts those that would violate serializability. UI tell: occasional "please retry" errors under load, which the UI should handle silently for the user (auto-retry up to N times before surfacing).

## What a designer should take from this chapter

1. **"Two users hit save at once" is a real, named, designable problem.** It has a UI: version conflict flows, locked records, real-time presence indicators.
2. **The default isolation level is rarely serializable.** Most production systems run at read committed or snapshot isolation, and write skew is possible. Surface invariants in the UI for the cases where this matters.
3. **Multi-step user actions across services aren't atomic.** Design the partial-success states explicitly — "submitted, processing, completed, partially completed, reversed."
4. **"Durable" is a real promise.** Don't say "Saved" if the backend says "Buffered." Match the UI to the actual guarantee.

## Connections forward

- Distributed transactions (across multiple machines/services) — the hard mode of this chapter — appear in Chapter 9 (2PC, consensus).
- The "log of changes" view (which underlies SSI and CDC) recurs in Chapter 11 (event sourcing).
- Why timestamps and clocks can't be used to order transactions reliably → Chapter 8.

---


# Chapter 8 — The Trouble with Distributed Systems

## The frame

The previous chapters were generous: they let us pretend the machines work, the network delivers, and time means what we think it means. This chapter takes all three back.

Distributed systems fail in ways single machines don't. The book's central argument: the difference isn't that more things can break — it's that you can't tell *what* broke. A request sent to another machine that gets no reply might mean: the request was lost, the work was done but the reply was lost, the other machine crashed mid-work, or the other machine is fine and just slow. From your side, all four look identical.

For a designer, this is the chapter that explains why "loading…" never quite ends, why retries can cause duplicate charges, and why "last edited 5 seconds ago" is sometimes a lie.

## Faults and partial failures

In a single machine, things either work or they crash entirely. In a distributed system, some things work and some don't, simultaneously and unpredictably. This is "partial failure" and it's the dominant failure mode.

The cloud assumption: machines fail, networks drop packets, disks fill, processes pause. Not as rare exceptions — as routine. Software must be built to handle them.

**Design moves:**
- Loading states need timeouts and "still loading" affordances. A spinner that runs forever is silently telling the user "we don't know what's happening." Better: "Still working… if this takes more than 30 seconds, [try again / contact support]."
- For any action that might be retried automatically, ensure the UI doesn't tell the user it succeeded prematurely *or* offer a manual retry button that could double-submit. (See idempotency in Ch. 11.)
- "Status" pages for B2B products are not optional. If a downstream system is degraded, your users want to know it's not them.

## Unreliable networks — the things that go wrong

The network drops packets, reorders them, duplicates them, delays them by seconds or minutes. TCP papers over a lot of this for you, but not all. And the worst case is the one that's hard to handle: **a request was sent, no response came back, and you have no idea whether the work was done.**

This shapes UX in subtle ways:
- **Retry buttons must be idempotency-aware.** Hitting "Submit" a second time after a failed first attempt should not place two orders. Server-side idempotency keys (a unique request ID per submission) are the standard fix, and the UI must hold onto that key across retries.
- **Timeouts are design decisions, not engineering defaults.** A 30-second timeout means the user waits 30 seconds for a definite failure. A 5-second timeout with optimistic retry means they wait 5 seconds and then either see "success" or "still trying" — much better UX. Talk timeout values with the engineer; they matter.
- **Long-poll, WebSocket, SSE connections drop.** Real-time features need reconnect indicators that don't panic the user. "Reconnecting…" is fine; a red "DISCONNECTED" banner that flashes every 30 seconds is not.

## Detecting faults — timeouts are the only tool

You can't tell a crashed node from a slow one. The only thing you can do is wait, then declare it dead. How long to wait? Too short → false positives (you declare healthy nodes dead, causing cascades). Too long → real failures take forever to recover from.

Practical UX consequence: **systems take a noticeable amount of time to react to a real failure.** Failover isn't instant. If a primary database dies, there's a 10-30-second window where requests fail before the system fails over. A well-designed UI handles that window gracefully — retries, queues, "experiencing issues" banners — rather than presenting it as user-error.

## Unreliable clocks — the most surprising lesson in the chapter

Computers have two kinds of clock:

- **Time-of-day clocks** — what time it is in human terms (UTC, etc.). Synchronized via NTP. Can jump forward or backward without warning. Can lie by tens of seconds. Useful for displaying times to humans; useless for ordering events.
- **Monotonic clocks** — what time it is in elapsed-since-some-point terms. Always moves forward. Useless for human time but reliable for "did A happen before B *on this machine*."

The killer point: **across machines, even with NTP, clocks drift by seconds to tens of seconds and routinely disagree about ordering.** Two events that the system says happened "at the same time" might actually be 30 seconds apart. Two events the system says happened in order might be in the reverse order in reality.

Design consequences are everywhere once you see them:
- **Never trust client-side timestamps for anything that matters.** A user submits a comment with their device's clock saying it's 3:42 PM. Another user's device says 3:38. The "later" comment in the feed might be the one that was actually sent first. For ordering, use server time, and even then prefer server-assigned sequence numbers over wall-clock time.
- **Last-write-wins is broken when based on wall-clock time.** Two writes happen on different nodes; whichever has the later timestamp wins. But if one node's clock is fast, its writes always win, regardless of when they actually happened. (This is one of Cassandra's classic gotchas.)
- **"Last edited 5 seconds ago" needs to come from one trusted source.** If different clients each stamp the time, they'll all disagree. Use server time, sent down with the record.

## The bounded-uncertainty model — Google Spanner's trick

Google's Spanner database confronts the clock problem directly: it uses GPS and atomic clocks to keep clock uncertainty bounded (within a few milliseconds), then explicitly waits out the uncertainty window before committing. The cost: every transaction commits about 7ms slower than it could in theory. The benefit: globally-consistent, externally-consistent transactions.

You won't design directly to Spanner, but the principle is useful: **honest uncertainty is better than fake certainty.** If you can't know exactly when something happened, the UI should reflect that — "around 3:42 PM" rather than "3:42:17 PM" for events spanning multiple regions.

## Process pauses — the demon under the floor

The chapter spends real time on this: any process can pause, unpredictably, for seconds. Garbage collection pauses (Java, .NET) can be 10+ seconds. VM live migrations pause the VM. Disk swapping pauses everything. Even a `kill -STOP` followed by `kill -CONT` is a pause.

From the system's perspective, a paused process is indistinguishable from a crashed one. This means: even a "leader" of a consensus group can be paused so long that the rest of the system elects a new leader, and when the old leader wakes up it thinks it's still the leader. Both think they're the leader. Two leaders → split brain → data corruption if not carefully prevented (fencing tokens — see Ch. 9).

For designers, this surfaces as:
- **Stale tabs.** A user's tab was backgrounded for 20 minutes; when they switch back, the session state is wildly out of date. Detect this (Page Visibility API, last-activity heartbeats) and refresh aggressively rather than letting them act on stale data.
- **Mobile apps coming out of suspension.** Same problem, longer time scale. Force a sync on resume.
- **Long-running modals.** If the user has a form open for 40 minutes, the world has moved on. Either expire the session, refetch the underlying record, or warn them on save.

## Knowledge, truth, and the majority

How does any node know what's true? Not by its own opinion — it can be wrong (clock drift, pauses, false positives). The book's answer, foreshadowing consensus: **truth is whatever the majority of nodes agree on**, and any individual node's view can be overruled.

Practical UX surface: **a single node's view of "you're authenticated" can be revoked.** Session invalidation, token revocation, "you've been signed out on this device" — these are the user-facing edges of the system reconciling truth across nodes. Design them as routine events, not catastrophes.

## Byzantine faults — when nodes lie

So far the assumption is: nodes might be slow or crashed, but if they answer, they answer truthfully. *Byzantine* faults are when nodes lie — sending wrong values, claiming they did work they didn't, actively deceiving. Real in adversarial settings: blockchains, military, multi-party financial settlement.

Most products you'll design don't deal with Byzantine faults at the system level. But you might design for them at the *user* level: any system where users can submit data adversarially (review systems, fraud detection, social networks) has a similar shape — assume input is hostile, validate, cross-check, rate-limit. The same instincts apply.

## System models — what we promise vs. what we hope

The chapter ends with a useful distinction. Every distributed algorithm makes assumptions about timing (synchronous? asynchronous? partially synchronous?) and node behavior (crash-stop? crash-recovery? Byzantine?). These are *system models*, and the algorithm is only correct if the assumptions hold.

For designers, the parallel is: **every UI rests on assumptions about backend behavior.** If you design assuming "writes are instant and durable" and the backend actually does "writes are buffered and async," the UI will lie to users. Surface and verify your assumptions explicitly during design review.

## What a designer should take from this chapter

1. **A request that didn't reply is ambiguous, not failed.** Design retry flows that don't double-submit (idempotency keys, "submitting…" states, confirmation rather than re-submission).
2. **Don't trust client clocks for ordering.** Use server time for anything users will compare across.
3. **Timeouts are UX, not infrastructure.** Choose them; surface them; design for the slow case.
4. **Stale tabs, resumed apps, long-open modals — all are pause-equivalents.** Force a sync rather than assume.
5. **Honest uncertainty beats false precision** in timestamps, freshness indicators, and status displays.

## Connections forward

- The "how does the cluster decide what's true" question is the entire subject of Chapter 9 (consensus, linearizability).
- The "writes are events, not states" reframing in Chapter 11 is partly a response to the time-and-ordering problems described here.
- Fencing tokens for preventing split-brain are introduced briefly here and explained in Ch. 9.

---


# Chapter 9 — Consistency and Consensus

## The frame

If Chapter 8 was the bad news (everything fails, clocks lie, you can't tell crashed from slow), this chapter is the careful good news: there *are* protocols that let a group of unreliable machines agree on a single truth, in a single order, even when some of them are broken. They're expensive — but they exist, and they're what every "strongly consistent" claim ultimately rests on.

For designers, this chapter is the deepest layer of the "what can the system actually promise?" question. The answer ranges from "almost nothing, it'll work out eventually" to "globally-ordered, serializable, externally consistent" — and the UI must be honest about which.

## The consistency spectrum — strongest to weakest

The book carefully separates several consistency models. They're often conflated. They're not the same.

### Linearizability (strong consistency)
The system behaves as if there were a single up-to-date copy. Once a write is acknowledged, every subsequent read everywhere sees it. The intuitive "things just work" model.

UI implication: you can show data right after writing it, anywhere, and it'll be correct. **You almost never get this in practice** — it requires consensus, which is slow and intolerant of network partitions.

### Sequential consistency
All nodes agree on the order of operations, but not necessarily real-time order. Slightly weaker than linearizable.

### Causal consistency
Operations that *causally* depend on each other are ordered correctly; independent operations can be reordered. This is what you want for chat ("answer doesn't appear before question") without paying for full linearizability.

### Eventual consistency
If no new writes happen, eventually all replicas converge. Says nothing about *when*, or about ordering. The weakest useful guarantee.

UI implication: "eventually consistent" gives you almost no UX assurances. You must design the screen as if any individual read could be stale, out of order, or inconsistent with the previous one.

## The CAP theorem — what it actually says (and doesn't)

The famous CAP theorem is one of the most-misunderstood ideas in the field. The book is careful: CAP is *not* "pick two of three." It says: when a network partition occurs, a system must choose between consistency and availability for the partitioned side. Outside of partitions, you can have both.

What it doesn't say:
- That you have to pick a side forever.
- That latency tradeoffs don't matter (they often matter more than CAP).
- That "AP" systems are always available — they're not, just available *during partitions*.

A more useful framework the field has moved toward: **PACELC.** During a Partition, choose A or C; Else, choose Latency or Consistency. Most systems make both trade-offs.

UI relevance: **the system's behavior during a regional outage is a designable surface.** Does the app go read-only? Show stale data with a banner? Fail closed? Each has a UX. Don't leave it to chance.

## Linearizability — what makes it expensive

Linearizability essentially requires the nodes to agree, in real time, on the order of every operation. That coordination doesn't come free:

- **Latency goes up.** Every write must reach a quorum and be confirmed before acknowledging.
- **Availability goes down.** During a partition, the smaller side cannot accept writes (or it gives up linearizability).
- **It does not compose well across systems.** A linearizable database plus a linearizable cache plus a linearizable search index do not automatically combine into a linearizable whole.

The designer-relevant case: **for some screens, you genuinely need it.** Account balances after a deposit. Inventory after a purchase. "Is this user banned?" after a moderation action. For these screens, accept the latency and design accordingly (loading states, "verifying…" indicators).

For most other screens — feeds, profiles, search results, dashboards — eventual or causal consistency is fine, and pushing for linearizable would be expensive theater.

## Ordering and causality

The deep idea of the chapter: a lot of distributed-systems problems reduce to "what order did these things happen in?" If you can establish a total order of events, agreed upon by every node, many other problems become solvable.

Two ways to get there:

### Logical clocks (Lamport timestamps)
Every event gets a counter that increases monotonically and reflects causality. Lamport timestamps preserve "if A caused B, then A's timestamp < B's timestamp." But they don't tell you that — two events with timestamp 47 might be concurrent, not at the same time. Useful but not sufficient for everything.

### Total order broadcast
Every node receives every message, in the same order. Equivalent in strength to linearizable register and to consensus. Implementing this is what Paxos/Raft are for.

UI relevance: **anywhere the user perceives an order — a feed, a timeline, an audit log, a chat — that order needs to be assigned somewhere.** Server-assigned sequence numbers from a totally-ordered log are the gold standard. Client timestamps are not.

## Two-phase commit (2PC) — the classic distributed transaction

2PC is the way to commit a transaction across multiple databases/services atomically. It has two phases:
1. **Prepare:** the coordinator asks every participant "can you commit?" Each replies yes or no.
2. **Commit:** if all said yes, coordinator says "commit." Otherwise "abort."

The killer flaw: if the coordinator crashes between phases, participants are stuck "in doubt" — they've prepared but don't know whether to commit or abort. They hold their locks (blocking other transactions) until the coordinator recovers. In practice, this happens, and it's bad.

2PC is the textbook answer to distributed transactions. It's also rare in modern architectures, because the blocking behavior is too risky at scale. The book is honest about this — 2PC is technically sound but operationally fraught.

For designers: **most modern systems don't actually do distributed transactions.** They use sagas (compensating transactions on failure), event-driven workflows, or just accept eventual consistency. When the engineer says "we use sagas," that means the UI may show a state, then later un-show it (compensated). Design language for that.

## Fault-tolerant consensus — Paxos, Raft, ZAB

Consensus is the technical core of everything strongly-consistent in distributed systems. It's the protocol by which a group of nodes agrees on a value, surviving up to a minority of crashes. Paxos, Raft, and ZAB are three implementations of essentially the same idea.

Properties of consensus algorithms:
- **They tolerate crashes** (up to a minority of nodes).
- **They do not tolerate partitions of the leader from the majority** — during such a partition, the system pauses.
- **They are slow** by single-machine standards. Every "decision" requires a round-trip to a majority.

What's built on consensus:
- ZooKeeper, etcd, Consul — coordination services that almost every distributed system uses for leader election, distributed locks, configuration.
- The internals of Spanner, CockroachDB, FoundationDB.
- Kubernetes' control plane.
- Most blockchain consensus mechanisms (different threat model, but same problem).

UI relevance is indirect but real: **when the consensus quorum pauses, the system pauses.** Failover events, leader elections, and cluster recoveries are visible as brief "everything is slow / no writes accepted" windows. A graceful UI shows "reconnecting" or "pending" rather than failing hard.

## Linearizable, but where?

A subtle move the chapter makes: even systems advertised as "strongly consistent" usually only guarantee linearizability for individual operations, not for the application as a whole. A single key's writes are linearizable. A multi-key transaction may or may not be. A read followed by a write across different keys is almost certainly not.

For designers, the practical version: **don't assume "strongly consistent database" means "the app behaves intuitively."** Ask: linearizable for what operations? Across what scope? Multi-key? Multi-tenant? Multi-region?

## Membership and coordination services

ZooKeeper / etcd-style services hold the "ground truth" for things like:
- Who's the leader of this cluster?
- Which nodes are healthy?
- What's the current configuration?
- Who holds this distributed lock?

When you hear "we use Zookeeper" or "etcd for service discovery," that's a consensus-backed coordination service underneath. It can pause briefly during partitions. When it pauses, dependent services often pause too. This is one of the reasons "the whole region was degraded for 4 minutes" incidents happen.

## What a designer should take from this chapter

1. **"Strongly consistent" is a real spec, not a marketing claim.** Ask which operations and what model — linearizable, sequential, causal? Each has different UI implications.
2. **The CAP "choice" lives in your UX.** What does the app look like during a partition? Read-only? Stale-with-banner? Failed? This is a design decision, not an inevitability.
3. **Order is assigned somewhere.** For anything users perceive as ordered, the order must come from a single trusted source — server sequence numbers, total order broadcast, consensus log.
4. **Sagas and compensation are visible.** If the backend can un-do a successful-looking action later, the UI needs vocabulary for that ("reversed," "rolled back," "compensated") and a notification path for the user.
5. **Brief system pauses during failover are normal.** Design "reconnecting" and "pending" affordances; don't panic the user.

## Connections forward

- The "events as a totally-ordered log" idea is the foundation of Chapter 11 (stream processing, event sourcing, CDC, Kafka).
- Batch processing (Chapter 10) can re-derive consistent views from event logs, sidestepping some distributed-transaction pain.

---


# Chapter 10 — Batch Processing

## The frame

Batch processing = take a large, bounded amount of input data, chew through it, produce output. No real-time pressure; the job runs for minutes or hours and either succeeds or fails as a whole. The canonical examples: nightly ETL into the data warehouse, weekly report generation, search index rebuilds, recommendation model training.

The chapter starts with Unix pipelines (`sort | uniq | grep`) as the philosophical ancestor, then walks through MapReduce, distributed filesystems, and the post-MapReduce generation (Spark, Flink batch, dataflow engines).

For designers, this is the chapter that explains why dashboards lag, why reports run overnight, why search indexes are "rebuilding," and where the data that fills your analytics screens actually comes from.

## The Unix philosophy as a design principle

Before getting to distributed systems, the book makes a deliberate detour through Unix. Why? Because Unix tools embody a set of principles that turn out to be the same ones that make distributed batch systems work:

- Each tool does one thing well.
- Output of one tool is input to another.
- Text is the universal interface.
- Composition is the unit of power.

The designer translation: **good systems compose because their interfaces are uniform and minimal**. The same logic that makes `sort | uniq | wc` work makes ETL pipelines work, and makes well-designed component libraries work. When you're designing an internal tool, treat the steps as composable rather than monolithic — each step has a clear input and output, and the user can re-enter at any step.

## MapReduce — the mental model

MapReduce was Google's 2004 paper that catalyzed the modern data-processing world. The idea is shockingly simple:

- **Map** — for each input record, produce zero or more key-value pairs.
- **Shuffle** — group all values with the same key together (this is the magic step, done by the framework).
- **Reduce** — for each key, do something with the grouped values.

Why this matters: this two-step model, plus a distributed filesystem (HDFS), plus a scheduler, lets you process petabytes across thousands of machines, with automatic retries, fault tolerance, and parallelism.

For designers, two things to know:
- **MapReduce jobs are slow by interactive standards** (minutes to hours). Any UI that depends on a MapReduce-style pipeline cannot be "live" — it's at best "as of the last successful run."
- **Failures of individual machines are invisible to the job.** The framework retries. This is why batch processing is so durable; it's also why a single bad input can quietly fail a job after hours of work.

## Joins in batch processing

A lot of batch work is joins — combining two datasets. The book covers the patterns:

### Sort-merge join
Both inputs are sorted by the join key, then walked in parallel. Fast, well-understood. The classic MapReduce join.

### Broadcast hash join
One input is small enough to fit in memory on every reducer. Broadcast it; the other side is streamed past it. Very fast.

### Partitioned hash join
Both inputs are partitioned by the join key into the same number of partitions. Then each partition is joined independently.

UI relevance is indirect: **joining two large datasets is expensive, and the time it takes is part of why the dashboard you're designing won't be real-time.** If the analytics team says "we need to join the events table with the dimension tables," that's the operation that's running every hour or every night to produce what your dashboard reads.

## The output of batch workflows

Batch jobs produce stable, finished outputs:
- Updated search indexes (which then serve queries instantly).
- Materialized views (pre-computed answers to common dashboard queries).
- Files of derived data, ready to be loaded into a serving system.
- ML model artifacts.

The key property: **a batch job is reproducible.** Same input, same code = same output. Run it again and you get the same answer. This is what makes it trustworthy enough to be the foundation of analytics.

Design implications:
- **"Last updated" timestamps on dashboards reflect the last successful batch run.** If yours doesn't show one, add one.
- **Reprocessing is normal.** When a bug is found in the analytics code, the team reruns the job for the affected period. The dashboard's numbers may change retroactively. Surface this honestly: "numbers may be revised; figures as of [date]."
- **Search indexes are batch outputs.** That fast-as-light search box is reading from an index that may be hours or days old. New records may not show up immediately. Decide whether to surface this or paper over it (e.g., merging "fresh" recent records into the search results from a live source).

## MapReduce vs. distributed databases

The chapter is careful about the difference. A distributed analytical database (Redshift, Snowflake, BigQuery) and a MapReduce-style batch system (Hadoop, Spark) can both process petabytes — but they have different shapes:

- **MPP databases** are integrated systems with their own storage layout, query optimizer, and serving layer. Great for ad-hoc SQL.
- **MapReduce-style systems** decouple storage (a filesystem like HDFS or S3) from compute. Different engines can read the same data. More flexible but more operational overhead.

Modern reality: most analytics stacks are a mix. Raw data lands in object storage (S3, GCS). It's processed by Spark or similar. Results land in a warehouse (Snowflake, BigQuery) for BI access. Different tiers serve different UI needs.

For a designer, the practical implication: **the BI dashboard and the "data lake" exploration tool are often pointed at different systems with different SLAs.** The BI tool's data is curated, tested, refreshed on schedule. The data lake is raw, fresh, but unreliable. If you're designing an analytics product, know which one each surface is pulling from.

## Beyond MapReduce — Spark, Flink, dataflow

MapReduce was foundational but limited: every step writes to disk, every step starts fresh, iterative algorithms (ML training, graph processing) are painful. The next generation — Spark, Flink, Tez, Beam — keeps intermediate state in memory, models computation as a DAG (directed acyclic graph) of stages, and runs orders of magnitude faster.

The user-facing consequence: **interactive analytical queries on huge datasets became feasible.** A Spark job over 10TB might run in 30 seconds instead of 30 minutes. Dashboards moved from "overnight refresh" to "every 15 minutes" to (sometimes) "on demand."

But: 30 seconds is still slow for a UI. Even with modern engines, the dashboard you're designing against a data lake will not feel like a transactional app. Loading states, partial results, progressive rendering, and "this query will take a while — should we email you when it's done?" affordances are all part of the design.

## Graphs and iterative processing

The chapter briefly covers iterative algorithms on graph data — PageRank, shortest paths, connected components. These need many passes over the data, which MapReduce handles poorly and Spark/Pregel-style systems handle well.

Designer relevance: any product feature shaped like "second-degree connections," "fraud rings," "lateral movement detection" (cyber), or "molecule similarity" (pharma) is likely backed by an iterative graph job that runs in batch. The UI needs to be honest that these results are computed periodically, not on demand.

## High-level APIs and declarative dataflow

Modern batch engines accept declarative queries (SQL, dataframe APIs) and compile them to optimal execution plans. Spark SQL, BigQuery SQL, dbt models — these all live in this layer.

For analytics product designers, this is the layer where most actual work happens. The vocabulary that dominates:
- **Models / tables / views** — named, versioned derived datasets.
- **Dependencies (DAGs)** — model A depends on B and C; rebuilding A means rebuilding what it depends on.
- **Tests / data quality checks** — assertions about freshness, uniqueness, expected ranges.
- **Lineage** — what dataset is derived from what.

If you're designing internal data tools, expose this vocabulary. Show users the dependency graph, the last-run timestamp, the quality check status, the lineage. Modern data teams expect this; surfacing it is the difference between a usable internal tool and one people work around.

## What a designer should take from this chapter

1. **Batch is what feeds your dashboards.** "Real-time" usually means "every 15 minutes" or "every hour" at best. Show the freshness honestly.
2. **Search indexes, recommendations, and ML-driven features are batch outputs.** New data takes time to be reflected. Surface this when it matters.
3. **Reprocessing is routine and visible.** Numbers can change retroactively when the team fixes a bug. Design the UI to communicate "figures revised on [date]."
4. **Compose, don't conglomerate.** The Unix philosophy applied to UI: a workflow made of clear steps with stable interfaces is easier to evolve than a monolith.
5. **Long-running queries need long-running UI.** Email-when-done, progress, cancellation, persistent results — these are standard patterns for analytics tools, not afterthoughts.

## Connections forward

- Chapter 11 (stream processing) is the "what if we didn't wait for batch, and instead processed events as they arrived" generalization. Many modern systems use a "lambda" or "kappa" hybrid of batch and stream.
- The "events as immutable facts" idea that powers reprocessing in batch is the same idea behind event sourcing in Chapter 11.
- The "derived data" theme — a dashboard reads from a view derived from raw events — is the unifying frame of Part III.

---


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

---


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

---

