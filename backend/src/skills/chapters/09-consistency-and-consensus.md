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
