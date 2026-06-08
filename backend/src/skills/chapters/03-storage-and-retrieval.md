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
