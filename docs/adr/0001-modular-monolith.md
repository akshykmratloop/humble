# ADR-0001: Modular monolith over microservices for MVP

## Status

Accepted

## Context

Humble's MVP needs auth, profiles, discovery, matching, messaging, game mechanics, payments, moderation, notifications, and analytics. The team size is effectively 1–3 engineers (the "CTO+Claude" build model). Microservices add operational overhead (service discovery, distributed transactions, per-service CI/CD, network failure handling) that isn't justified before product-market fit is established.

## Alternatives considered

1. **Full microservices from day one** — rejected: too much operational burden for team size and unproven product; distributed transactions for match creation (touching Like/Reject/Match/Streak/Notification) would require sagas/outbox from day one with no scale justification yet.
2. **Serverless functions per endpoint** — rejected: game-mechanic and matching logic needs transactional consistency and low-latency in-process calls; cold starts hurt the swipe-latency-sensitive discovery loop.
3. **Modular monolith (NestJS) with clear module boundaries** — accepted.

## Decision

Build a single NestJS backend (`apps/api`) organized into clearly bounded modules (`auth`, `users`, `profiles`, `discovery`, `matching`, `messaging`, `game`, `powerups`, `payments`, `moderation`, `notifications`, `analytics`), each with its own domain models, services, and controllers, communicating in-process. Shared code lives in `packages/*` (domain, database, validation, config, analytics). A single PostgreSQL database (Prisma) is authoritative; Redis is used for ephemeral/derived state only, never as source of truth.

Modules are designed with internal cohesion and explicit public interfaces (service classes) so that any module can be extracted into its own service later without a rewrite, if scale demands it.

## Consequences

- Faster initial development, single deployable unit, single CI/CD pipeline.
- Simpler transactional integrity for cross-module operations (e.g., creating a Match touches Like/Reject/Match/Streak — can be a single DB transaction).
- Must enforce module boundaries by convention/lint rules (no reaching into another module's repository directly — go through its service).
- Revisit if/when a specific module (e.g., messaging or discovery) needs independent scaling, deployment cadence, or a different team owns it.
