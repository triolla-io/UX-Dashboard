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
