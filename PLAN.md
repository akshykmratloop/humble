# Humble — Living Plan

This is the living architecture + decisions log entry point. Full documents live in `docs/`. This file tracks current phase, service map, and open questions at a glance — update it whenever an architecture decision changes (global CLAUDE.md §15).

## Current phase

**Phase 13 — Foundation implementation** (Slice 0 of `docs/11-implementation-roadmap.md`), following completed planning phases 0–12.

## Document map

| Doc | Covers |
|---|---|
| [docs/00-product-discovery.md](docs/00-product-discovery.md) | Vision, mechanic redesigns, risks, MVP proposal, North Star metric |
| [docs/01-prd.md](docs/01-prd.md) | Full functional/non-functional requirements |
| [docs/02-user-journeys-state-machines.md](docs/02-user-journeys-state-machines.md) | Journeys + state machines for every entity |
| [docs/03-design-system.md](docs/03-design-system.md) | Brand, tokens, components, motion |
| [docs/04-domain-model.md](docs/04-domain-model.md) | Bounded contexts, entities, events, aggregates |
| [docs/05-hld.md](docs/05-hld.md) | High-level architecture |
| [docs/06-lld.md](docs/06-lld.md) | Per-module low-level design |
| [docs/07-database-design.md](docs/07-database-design.md) | Full schema |
| [docs/08-api-contracts.md](docs/08-api-contracts.md) | REST/WS contracts |
| [docs/09-threat-model.md](docs/09-threat-model.md) | Invariants, STRIDE, abuse mitigations |
| [docs/10-testing-strategy.md](docs/10-testing-strategy.md) | Test layers, coverage targets, Visual QA loop |
| [docs/11-implementation-roadmap.md](docs/11-implementation-roadmap.md) | Vertical slices, MVP done-gate |
| [docs/adr/](docs/adr/) | Individual architecture decision records |

## Service map (MVP)

Modular monolith: `apps/web` (Next.js JS) ↔ `apps/api` (NestJS JS, modules: auth, users, profiles, discovery, matching, messaging, game, safety, notifications, analytics, admin) ↔ PostgreSQL (Prisma) + Redis + S3. See `docs/05-hld.md` for the full diagram.

## Key decisions (see docs/adr/ for full rationale)

- ADR-0001: Modular monolith, not microservices, for MVP.
- ADR-0002: Super Reject and Shields redesigned — no account-level harm, no "buy protection from a threat we created."
- ADR-0003: Kill Streak has an explicit, farm-resistant state machine.
- ADR-0004: Berserker Mode never weakens block/report — hard invariant.
- ADR-0005: "Enemy takeover" replaced with a sandboxed, curated Profile Takeover Challenge — no real profile edits, ever.
- ADR-0006: Humble Match uses mutual reveal (per-user client trigger), not an immediate spoiler push.

## Stack (fixed baseline, JavaScript only — no TypeScript)

Next.js + Tailwind + shadcn/ui + Framer Motion + Lucide + React Hook Form + Zod + TanStack Query | NestJS + Prisma + PostgreSQL + Redis + Socket.IO | AWS S3 | Stripe (post-MVP) | GitHub Actions | Docker.

## Open questions requiring product-owner approval

See `docs/00-product-discovery.md` §18. Nothing here blocks MVP implementation.

## Next up

Slice 0 (Foundation) implementation — see `TASKS.md`.
