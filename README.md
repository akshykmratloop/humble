# Humble

A dating app where mutual rejection is also a match. Read [`PLAN.md`](PLAN.md) first — it indexes the full product/architecture spec in [`docs/`](docs/) and the current build status in [`TASKS.md`](TASKS.md).

## What is this

Traditional dating apps only match on mutual likes. Humble adds a second, equally real match type: if two people independently reject each other, that's a **Humble Match** — "you both thought you were too good for each other, so now you have to meet." A light competitive-game layer (streaks, power-ups) sits on top, designed so the humor never comes at the cost of user safety — see [`docs/09-threat-model.md`](docs/09-threat-model.md) for the non-negotiable invariants (block and report always work, no exceptions).

## Status

Pre-implementation: product discovery, PRD, UX/design system, domain model, HLD/LLD, database design, API contracts, threat model, and testing strategy are complete (see `docs/`). Implementation is proceeding vertical-slice by vertical-slice per [`docs/11-implementation-roadmap.md`](docs/11-implementation-roadmap.md), tracked in [`TASKS.md`](TASKS.md).

## Stack

Next.js (JavaScript, App Router) + Tailwind + shadcn/ui + Framer Motion, on a NestJS (JavaScript) modular monolith, PostgreSQL (Prisma), Redis, Socket.IO, AWS S3, Stripe (post-MVP). No TypeScript in this repo, by design — see [`CLAUDE.md`](CLAUDE.md).

## Getting started

Not yet runnable — foundation scaffold (Slice 0 of the roadmap) is in progress. Once scaffolded:

```bash
docker compose up -d
npm install
npm run dev
```

## Documentation

See [`PLAN.md`](PLAN.md) for the full document index.
