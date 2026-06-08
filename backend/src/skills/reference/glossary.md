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
