# Humble — Implementation Roadmap (vertical slices)

Stack decision (fixed baseline per product-owner instruction; deviations require an ADR): Next.js (JavaScript, App Router) + Tailwind + shadcn/ui + Framer Motion + Lucide + React Hook Form + Zod + TanStack Query for `apps/web`; NestJS (JavaScript) modular monolith for `apps/api`; PostgreSQL + Prisma; Redis; Socket.IO; AWS S3; Stripe (post-MVP); GitHub Actions CI/CD; Docker for local dev parity. **No TypeScript anywhere in this project**, per explicit instruction — Zod schemas are the runtime validation/contract layer that substitutes for compile-time types.

Each slice below follows SPEC → PLAN → EXECUTE → VERIFY → COMMIT (global CLAUDE.md §2) and is only started once the prior slice's tests are green and pushed.

## Slice 0 — Foundation
**Objective**: Monorepo scaffold, tooling, CI, local dev environment — no product features yet.
**Includes**: `apps/web` (Next.js JS skeleton), `apps/api` (NestJS JS skeleton), `packages/{domain,database,validation,config,analytics}`, `docker-compose.yml` (Postgres, Redis), Prisma schema matching `07-database-design.md` + initial migration, ESLint/Prettier config (JS, not TS), Husky pre-commit (lint-staged), GitHub Actions CI (lint, test, build), `.env.example`, health/ready endpoints.
**Verification**: `docker compose up` brings up Postgres+Redis; `npm run dev` serves both apps; `/health` and `/ready` return 200; CI pipeline green on a trivial PR.
**Rollback**: N/A (no prod deploy yet).

## Slice 1 — Auth
**Objective**: FR-01 end-to-end.
**Includes**: register/verify/login/logout/password-reset endpoints, session store (Redis), password hashing, rate limiting, unit+integration+API tests, minimal web UI (signup/login forms) rendered and visually verified in browser.
**Verification**: full FR-01 test matrix green; INV-related enumeration tests green.

## Slice 2 — Profile
**Objective**: FR-02 end-to-end.
**Includes**: profile CRUD, photo upload (S3 signed URL flow), preferences, public-view projection, onboarding UI flow.
**Verification**: profile completeness gating tested; public projection never leaks private fields (dedicated test); visual QA at all breakpoints.

## Slice 3 — Discovery
**Objective**: FR-03.
**Includes**: candidate query with all exclusion filters, discovery card-stack UI with swipe/tap interactions and Like/Reject animations (per design system §2.6, initial version).
**Verification**: blocked-users-never-shown test; empty-state relaxation logic tested; visual QA of the signature swipe animation at all breakpoints, `prefers-reduced-motion` fallback verified.

## Slice 4 — Matching (Normal + Humble)
**Objective**: FR-04, FR-05, FR-06.
**Includes**: decision submission + match-evaluation transaction, Match list UI, Normal Match celebration, Humble Match dramatized reveal (ADR-0006), `humbleMatchOptOut` enforcement.
**Verification**: race-condition test (concurrent decisions produce exactly one match), opt-out test, full Humble Match reveal visually inspected and iterated until it reads as the signature moment it needs to be.

## Slice 5 — Messaging
**Objective**: FR-09.
**Includes**: Conversation/Message entities, Socket.IO gateway, default ConversationPolicy, chat UI.
**Verification**: INV-1 adversarial test (blocked user cannot message) green; realtime delivery verified manually via two browser sessions; rate limits tested.

## Slice 6 — Safety (Block/Report) + basic Moderation
**Objective**: FR-14, FR-15, FR-17 (basic).
**Includes**: block/report endpoints, moderation-case queue + basic admin UI, audit logging.
**Verification**: full `invariants.spec` suite (INV-1, INV-2, INV-9) green; admin RBAC tested (403 for non-moderators).

## Slice 7 — Kill Streak
**Objective**: FR-10 per ADR-0003.
**Includes**: streak service, grace-window finalize job, milestone badge UI.
**Verification**: abuse-simulation suite (`10-testing-strategy.md` §4) green.

## Slice 8 — Notifications, Preferences, Account lifecycle, Analytics (MVP subset)
**Objective**: FR-18, FR-19, FR-20, FR-21.
**Includes**: in-app + email notifications, deactivate/delete flows, core funnel analytics events.
**Verification**: INV-8 test (deleted/deactivated users invisible immediately); notification preference enforcement tested.

## MVP done-gate
All slices 0–8 verified per `10-testing-strategy.md` §8, full E2E journey (signup → profile → discovery → both match types → messaging → block → report → moderator action) passes, `10-testing-strategy.md` CI gate green, staged deployment executed and production-verified per global CLAUDE.md §18.

## Phase 2 (post-MVP, requires product-owner approval on pricing/monetization per discovery doc §18)
Slice 9 Payments infra + Shields, Slice 10 Power-up inventory + full Kill Streak rewards, Slice 11 Berserker Mode (ADR-0004 invariant tests mandatory before ship), Slice 12 Profile Takeover Challenge (ADR-0005).

## Phase 3
Native mobile app evaluation, shareable achievement cards / growth loop, ID verification, international expansion.

## Environments
`local` (Docker Compose) → `dev` → `staging/UAT` → `production`, per global CLAUDE.md §33, with zero drift in migration history/config across them (§19).
