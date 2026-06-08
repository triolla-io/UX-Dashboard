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
