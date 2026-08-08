# Humble — High-Level Design (HLD)

## 1. Architecture style

Modular monolith (ADR-0001). One Next.js (JavaScript) web client, one NestJS (JavaScript) API process, one PostgreSQL database, Redis for ephemeral state, S3 for media, Socket.IO (hosted inside the NestJS process, Redis-backed adapter for horizontal scale) for realtime messaging, Stripe for payments.

## 2. System diagram

```
                    ┌─────────────────────┐
                    │      Users           │
                    └──────────┬───────────┘
                               │ HTTPS
                    ┌──────────▼───────────┐
                    │  Web Client (Next.js) │  apps/web
                    │  JS, App Router       │
                    └──────────┬───────────┘
                               │ REST (+ WebSocket for chat)
                    ┌──────────▼───────────┐
                    │   API Gateway layer   │  NestJS global pipes/guards:
                    │  (authN, rate limit,  │  Helmet, CORS, validation,
                    │   request/correlation │  auth guard, rate-limit guard
                    │   IDs)                │
                    └──────────┬───────────┘
                               │
     ┌────────────┬────────────┼────────────┬─────────────┬────────────┐
     ▼            ▼            ▼             ▼             ▼            ▼
  ┌──────┐   ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌─────────┐
  │ Auth │   │ Profiles│  │Discovery │  │ Matching │  │Messaging│  │  Game   │
  └──┬───┘   └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬────┘  └────┬────┘
     │            │            │             │             │            │
  ┌──▼────────────▼────────────▼─────────────▼─────────────▼────────────▼──┐
  │                Safety module (Block/Report/Moderation/Fraud)            │
  │        — consulted by every module above before any user-facing effect │
  └──────────────────────────────┬──────────────────────────────────────────┘
                                  │
     ┌────────────┬───────────────┼───────────────┬────────────┐
     ▼            ▼               ▼               ▼            ▼
  ┌────────┐  ┌─────────┐   ┌───────────┐   ┌───────────┐  ┌────────┐
  │Payments│  │Moderation│   │Notification│  │ Analytics │  │ Admin  │
  │(Stripe)│  │ /Admin   │   │  (push/    │  │  sink     │  │console │
  │        │  │          │   │  email)    │  │           │  │        │
  └───┬────┘  └────┬─────┘   └─────┬─────┘  └─────┬─────┘  └───┬────┘
      │            │               │              │            │
      └────────────┴───────┬───────┴──────────────┴────────────┘
                            ▼
        ┌─────────────────────────────────────────────────┐
        │  PostgreSQL (source of truth)  │  Redis (cache,  │
        │  via Prisma                     │  rate limits,   │
        │                                  │  sessions,      │
        │                                  │  streak timers) │
        └─────────────────────────────────┴─────────────────┘
                            │
                     ┌──────▼──────┐        ┌─────────────┐
                     │   AWS S3     │        │   Stripe     │
                     │ (photos,     │        │  (payments,  │
                     │  evidence)   │        │  webhooks)   │
                     └──────────────┘        └─────────────┘
```

## 3. Client applications

- **Web (`apps/web`)**: Next.js App Router, JavaScript, Tailwind + shadcn/ui, Framer Motion, TanStack Query for server-state, React Hook Form + Zod for client-side UX validation (server remains the security gate per global CLAUDE.md §6).
- Mobile: out of scope for MVP; architecture (REST + WebSocket contracts) is client-agnostic so a future React Native/native client can reuse the same API.

## 4. Backend structure

```
apps/api/
  src/
    main.js
    app.module.js
    common/            # guards, interceptors, filters, decorators
    modules/
      auth/
      users/
      profiles/
      discovery/
      matching/
      messaging/
      game/
      powerups/
      payments/
      safety/          # block, report, moderation, fraud
      notifications/
      analytics/
      admin/
packages/
  domain/              # shared domain types/validation schemas (Zod), pure logic
  database/            # Prisma schema + client + migrations
  validation/           # shared Zod schemas reused by web (generated contract) and api
  config/              # env schema/config loader
  analytics/           # event names/shapes shared by producers
```

## 5. API Gateway concerns (in NestJS, not a separate process for MVP)

Helmet (security headers), CORS allow-list, global `ValidationPipe` (Zod-backed), correlation-ID middleware (`x-request-id` generated/propagated), auth guard (session/JWT), rate-limit guard (Redis-backed, per-route configurable), global exception filter producing RFC 7807-style error bodies.

## 6. Authentication & Authorization

Session-based auth (server-side session in Redis, `HttpOnly` `Secure` cookie) chosen over pure stateless JWT for MVP because it makes session revocation (ban, logout-everywhere, deletion) trivial and correct — this is a security-first tradeoff over the marginal statelessness benefit, revisit if the API needs to scale beyond what a shared session store supports. OAuth (Google) supported via Auth.js-style flow. Role-based authorization (user/moderator/admin) checked via guard; object-level checks (do you own this Profile/Match/Conversation) enforced in each service method, not just at the route level.

## 7. Messaging (realtime)

Socket.IO server co-located in the NestJS process; Redis adapter (`socket.io-redis`) from day one so the design tolerates horizontal scale even though MVP may run a single instance. Every socket connection authenticates via the same session used by REST. Every emitted message is persisted to Postgres first, then broadcast — the database is the durable record, the socket is a delivery optimization, never the source of truth.

## 8. Storage

- PostgreSQL (RDS in production, local Docker for dev) — authoritative for all durable state.
- Redis (ElastiCache in production, local Docker for dev) — sessions, rate-limit counters, discovery-candidate cache, streak grace-window timers (backed by durable `StreakEvent` rows so Redis is a performance/derived layer only, never the sole record).
- S3 — photos, moderation evidence, via signed upload/download URLs; CloudFront in front for production delivery.

## 9. Payments

Stripe Checkout for purchase initiation; Stripe webhooks (signature-verified) are the only path that grants entitlements — the client-side "success" redirect never itself grants anything (FR-16, INV in threat model).

## 10. Observability

Structured JSON logs (pino), correlation/request IDs threaded through every log line, `/health` (liveness) and `/ready` (readiness — checks DB/Redis connectivity) endpoints, metrics exposed for Prometheus scraping, OpenTelemetry tracing scaffolding included from the foundation phase even if the MVP doesn't yet ship a full tracing backend.

## 11. Infrastructure (target production shape; MVP may run a simplified subset)

```
AWS
├── ECS/Fargate      — apps/api (and apps/web if not on Vercel)
├── RDS PostgreSQL
├── ElastiCache Redis
├── S3 + CloudFront  — media
├── Route 53         — DNS
└── CloudWatch       — logs/metrics/alerts
```

Note: `apps/web` (Next.js) is well-suited to Vercel; `apps/api` (NestJS, stateful WebSocket) runs on ECS/Fargate. This split is a deployment-target decision, documented as ADR-0007 once infra work begins (Phase 13+), not before — avoid over-committing to infra before the app exists.

## 12. Why not microservices (cross-reference)

See ADR-0001.
