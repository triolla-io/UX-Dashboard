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
