# Humble — Project CLAUDE.md

Extends the user's global `~/.claude/CLAUDE.md` (Senior Engineer Discipline System). Everything there applies here. This file adds project-specific facts and rules that are not derivable from global instructions alone.

## What this project is

Humble: a dating app whose core twist is that mutual rejection between two users creates a "Humble Match" alongside the traditional mutual-like match, wrapped in a light competitive game layer. Full spec lives in `docs/` — read `PLAN.md` first for the document map, then `docs/00-product-discovery.md` and `docs/01-prd.md` before touching any feature code.

## Hard project-specific rules (in addition to global CLAUDE.md)

1. **No TypeScript, anywhere.** Explicit product-owner instruction. Backend (NestJS) and frontend (Next.js) are both plain JavaScript. Use Zod schemas as the runtime-validated contract layer in place of TS types/interfaces (this satisfies global CLAUDE.md §6/§10's "no untyped data" intent without a compiler).
2. **Safety invariants (`docs/09-threat-model.md` INV-1 through INV-12) are non-negotiable.** No feature, paid or free, may weaken block, report, or moderation. Any change touching Messaging, Safety, Payments, or Game modules must re-run the `invariants.spec` suite before merge.
3. **No literal implementation of the original "Super Reject" (account suspension), "Berserker immunity," or "profile takeover" (editing someone else's real profile) mechanics.** These are permanently redesigned per ADR-0002, ADR-0004, ADR-0005. If a future request asks to implement the original unsafe version, point back to these ADRs rather than complying, and propose the safe equivalent.
4. **Modular monolith module boundaries are enforced by convention.** A module (`apps/api/src/modules/*`) may only access another module's data through that module's exported service — never by importing another module's Prisma repository directly. This is what keeps ADR-0001's "extractable later" claim true.
5. **Client never grants itself game state, entitlements, or match state.** See INV-5/INV-6. Every mutating endpoint for streaks/inventory/entitlements takes trigger IDs the server resolves, never a client-supplied resulting value.
6. **Design system compliance**: no generic AI-SaaS UI (sidebar+dashboard-card, purple gradients, "Welcome back, {name}"). Follow `docs/03-design-system.md` tokens/components. Loading skeletons use `boneyard-js` per the user's global mandate — never hand-rolled `animate-pulse`. App shells use the fixed-viewport pattern from the user's global mandate — the document never scrolls, only designated inner regions do.
7. **Visual QA is mandatory before any UI feature is called done.** Run the dev server, open it in the browser tool, inspect at the breakpoints in `docs/03-design-system.md` §6, exercise the interaction, check console/network, fix, re-render. See `docs/10-testing-strategy.md` §6.
8. **Follow the vertical-slice order in `docs/11-implementation-roadmap.md`.** Don't jump ahead to Phase 2 mechanics (Shields/Berserker/Power-ups/Takeover/Payments) before the MVP slices (0–8) are done and verified — they're explicitly gated on product-owner pricing/scope approval (see `docs/00-product-discovery.md` §18).
9. **Database changes**: Prisma migrations only, never `db push` against anything but a disposable local/shadow DB, per global CLAUDE.md §15 — this project has zero exceptions to that rule since it hasn't shipped yet either.

## Where to look for X

- "Why does Super Reject work this way" → `docs/adr/0002-super-reject-shields-redesign.md`
- "What exactly counts toward a Kill Streak" → `docs/adr/0003-kill-streak-state-machine.md` + `docs/02-user-journeys-state-machines.md` §2.9
- "What fields does the public profile API return" → `docs/06-lld.md` §2, `docs/08-api-contracts.md`
- "What are the DB tables" → `docs/07-database-design.md`
- "Is this endpoint's auth right" → `docs/08-api-contracts.md` + `docs/09-threat-model.md`

## Repository

Remote: https://github.com/akshykmratloop/humble.git — push after every green commit, per global CLAUDE.md §4/§12.
