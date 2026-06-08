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
