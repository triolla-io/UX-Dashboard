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
