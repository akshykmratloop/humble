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

## Phase 13: Foundation (Slice 0) — DONE, verified

- ✅ Monorepo scaffold (`apps/web`, `apps/api`, `packages/*`), npm workspaces
- ✅ `docker-compose.yml` (Postgres, Redis) — verified running locally
- ✅ Prisma schema + initial migration (`20260808174114_init`) matching `docs/07-database-design.md`, applied to local Postgres
- ✅ ESLint (flat config, Babel parser for apps/api's decorator syntax) + Prettier + Husky pre-commit — `npm run lint` and `npm run format:check` clean
- ✅ GitHub Actions CI (`.github/workflows/ci.yml`): lint, format-check, domain unit tests, API tests against a live-booted server, web build
- ✅ `.env.example`, config loader (`packages/config`, Zod-validated, fails fast on missing/invalid env)
- ✅ `/health`, `/ready` endpoints — verified via curl (DB + Redis connectivity checked)
- ✅ Next.js skeleton, fixed-shell layout (`app/layout.js` + `app/globals.css`), design tokens wired into `tailwind.config.js` per `docs/03-design-system.md` §2

## Phase 14: MVP vertical slices (see `docs/11-implementation-roadmap.md`)

- ✅ Slice 1 — Auth (FR-01): register/verify-email/login/logout/password-reset, bcrypt hashing, Redis-backed session, login rate limiting, anti-enumeration. 16 API tests green (`apps/api/src/modules/auth/__tests__/auth-profile.e2e.test.js`). Verified live via curl and via the browser (signup → verify → login).
- ✅ Slice 2 — Profile (FR-02): profile CRUD, preferences, two-step photo upload (dev-only local-disk stand-in for S3 — see "Known follow-ups" below), magic-byte validation, public-view field allow-list (birthdate/email never leak). Verified live via curl, the API test suite, and the browser (`/me` profile-setup form). Full signup→verify→login→profile-save flow independently re-verified with both the Claude Browser tool and the `next-browser` CLI (two separate real Chromium sessions) — zero console errors in either.
- ✅ Slice 3 — Discovery (FR-03): candidate query with self/decided/blocked/incomplete/status exclusions, age-range filter, reciprocal gender-preference filter (done in application code — see "Known follow-ups"), cursor pagination. Discovery card-stack UI with Like/Reject.
- ✅ Slice 4 — Matching: Normal + Humble (FR-04/05/06): decision submission + match evaluation using `packages/domain/match.js`, race-safe without needing serializable isolation (see code comment in `matching.service.js` and `docs/06-lld.md` §4), `humbleMatchOptOut` honored (INV-12), idempotent resubmission (INV-11), object-level authorization on match read/unmatch. Normal Match + Humble Match celebration UI (`MatchReveal`) per ADR-0006. 10 new API tests green (`apps/api/src/modules/matching/__tests__/discovery-matching.e2e.test.js`), 44 tests total. Both match types independently verified live in the browser end-to-end (real signup→profile→photo→discovery→decision→reveal flow) with zero console errors.
- ⬜ Slice 5 — Messaging (FR-09)
- ⬜ Slice 6 — Safety: Block/Report/Moderation (FR-14/15/17)
- ⬜ Slice 7 — Kill Streak (FR-10)
- ⬜ Slice 8 — Notifications/Preferences/Account lifecycle/Analytics (FR-18/19/20/21)

## Phase 15+: Post-MVP (blocked on product-owner approval, see discovery doc §18)

- ⬜ Slice 9 — Payments + Shields
- ⬜ Slice 10 — Power-up inventory
- ⬜ Slice 11 — Berserker Mode
- ⬜ Slice 12 — Profile Takeover Challenge

## Known follow-ups (disclosed simplifications, not silent gaps)

- **Photo storage**: `StorageService` (`apps/api/src/common/storage/storage.service.js`) falls back to local disk (`apps/api/uploads/`) when `S3_BUCKET` is unset. The two-step upload-url/confirm contract matches the documented S3 design (`docs/06-lld.md` §2); only the byte-storage backend needs swapping once AWS credentials are provisioned. `POST /v1/uploads/:key` dev-only endpoint is guarded to 403 once S3 is configured.
- **API test isolation**: `auth-profile.e2e.test.js` currently runs against the shared local dev stack (`docker compose up -d` + `npm run dev:api`), not an ephemeral testcontainers instance per global CLAUDE.md §5's ideal. Real Postgres/Redis either way (never mocked) — graduating to per-run isolated containers is tracked here before this suite is relied on unattended in CI at higher volume.
- **CI**: `.github/workflows/ci.yml` boots the API in the background and polls `/health` before running API tests — not yet exercised in a real GitHub Actions run (no push to a remote branch triggering it yet in this session).
- **Async photo moderation**: photos are provisionally APPROVED after passing structural checks (size/magic-bytes) — the real async moderation-queue integration is a documented post-MVP gap (`docs/01-prd.md` FR-02).
- **Reciprocal gender-preference filtering runs in application code, not SQL**: Prisma's `isEmpty`/`equals: []`/`hasSome` array filters were found to silently fail to match empty enum-array columns against the installed Prisma/Postgres driver combination (verified directly — not a logic bug on our side). `discovery.service.js` over-fetches and filters in JS instead; revisit if a Prisma upgrade fixes the underlying filter. At MVP scale this is a non-issue; would need attention before Discovery runs at real scale.
- **Discovery has no `Block`/`Report` UI yet** (Safety is Slice 6) — the exclusion query already reads the `Block` table so blocking will take effect the moment Slice 6 ships, but there's no way to block/report through the product yet.

## Notes

- Repo pushed to https://github.com/akshykmratloop/humble
- No TypeScript in this project — JavaScript + Zod runtime validation throughout, per explicit product-owner instruction.
- NestJS in plain JavaScript requires Babel (legacy decorators) + manual parameter-decorator application (`apps/api/src/common/decorators/apply-params.js`) since TS-style parameter decorators (`@Body()` inline in a method signature) aren't valid Babel-transpiled JS syntax — documented here since it's a non-obvious constraint that shapes every controller in this codebase.
