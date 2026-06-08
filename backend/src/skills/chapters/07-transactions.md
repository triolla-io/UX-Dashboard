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
