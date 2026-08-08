# Humble — Task Tracker

Status legend: ⬜ TODO · 🔄 IN PROGRESS · ✅ DONE (commit SHA noted) · ⏸️ BLOCKED (reason noted)

## Phase 0–12: Planning & Architecture

- ✅ Product discovery (`docs/00-product-discovery.md`)
- ✅ PRD (`docs/01-prd.md`)
- ✅ User journeys & state machines (`docs/02-user-journeys-state-machines.md`)
- ✅ Design system spec (`docs/03-design-system.md`)
- ✅ Domain model (`docs/04-domain-model.md`)
- ✅ HLD (`docs/05-hld.md`)
- ✅ LLD (`docs/06-lld.md`)
- ✅ Database design (`docs/07-database-design.md`)
- ✅ API contracts (`docs/08-api-contracts.md`)
- ✅ Threat model & invariants (`docs/09-threat-model.md`)
- ✅ Testing strategy (`docs/10-testing-strategy.md`)
- ✅ Implementation roadmap (`docs/11-implementation-roadmap.md`)
- ✅ ADR-0001 through ADR-0006 (`docs/adr/`)

## Phase 13: Foundation (Slice 0)

- ⬜ Monorepo scaffold (`apps/web`, `apps/api`, `packages/*`)
- ⬜ `docker-compose.yml` (Postgres, Redis)
- ⬜ Prisma schema + initial migration matching `docs/07-database-design.md`
- ⬜ ESLint/Prettier (JS) + Husky pre-commit
- ⬜ GitHub Actions CI (lint, test, build)
- ⬜ `.env.example`, config loader (`packages/config`)
- ⬜ `/health`, `/ready` endpoints
- ⬜ Next.js skeleton with fixed-shell layout scaffold, design tokens wired into Tailwind config

## Phase 14: MVP vertical slices (see `docs/11-implementation-roadmap.md`)

- ⬜ Slice 1 — Auth (FR-01)
- ⬜ Slice 2 — Profile (FR-02)
- ⬜ Slice 3 — Discovery (FR-03)
- ⬜ Slice 4 — Matching: Normal + Humble (FR-04/05/06)
- ⬜ Slice 5 — Messaging (FR-09)
- ⬜ Slice 6 — Safety: Block/Report/Moderation (FR-14/15/17)
- ⬜ Slice 7 — Kill Streak (FR-10)
- ⬜ Slice 8 — Notifications/Preferences/Account lifecycle/Analytics (FR-18/19/20/21)

## Phase 15+: Post-MVP (blocked on product-owner approval, see discovery doc §18)

- ⬜ Slice 9 — Payments + Shields
- ⬜ Slice 10 — Power-up inventory
- ⬜ Slice 11 — Berserker Mode
- ⬜ Slice 12 — Profile Takeover Challenge

## Notes

- Repo pushed to https://github.com/akshykmratloop/humble
- No TypeScript in this project — JavaScript + Zod runtime validation throughout, per explicit product-owner instruction.
