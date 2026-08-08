# Humble — Testing Strategy

Per global CLAUDE.md §5: three-layer test data (Migrations → Seeds → Factories), real database via testcontainers, no mocked DB in integration tests, `BEGIN...ROLLBACK` per test.

## 1. Test layers

- **Unit** (Vitest/Jest): pure domain logic — decision-evaluation matching rules, streak state-machine transitions, conversation-policy resolution, validation schemas. No DB, no network.
- **Integration**: service-level tests against a real Postgres (testcontainers) + real Redis, migrations applied, seed data loaded. Covers the transactional flows in the LLD (decision→match, block→conversation-close, webhook→entitlement).
- **API tests**: supertest-style HTTP tests against the running NestJS app — authentication, authorization (403s), validation (422s), rate limiting (429s).
- **Contract tests**: the generated OpenAPI spec is diffed in CI against the checked-in `openapi.yaml`; the web client's Zod schemas are generated from it — CI fails on drift (global CLAUDE.md §6).
- **E2E** (Playwright, browser-driven): critical journeys — signup→profile→first swipe→match (both types)→message; block; report. Run against a fully-seeded local stack.
- **Security tests**: authorization bypass attempts (cross-user object access), rate-limit enforcement, INV-1/INV-2 adversarial tests (buy Berserker → get blocked → assert 403), input-boundary fuzzing (XSS/SQLi payloads at every text field).
- **Payment tests** _(post-MVP)_: webhook success/failure/duplicate-delivery/refund/chargeback, entitlement idempotency under replayed events.
- **Load tests** (k6 or Artillery, post-MVP once infra exists): discovery candidate query under concurrent load, matching race conditions under concurrent decision submission, messaging throughput.
- **Failure-injection tests**: DB connection loss mid-transaction (must not leave partial state — verified via the transactional boundaries in LLD §4), Redis unavailable (session/rate-limit degrade gracefully, documented fallback behavior, never silently open the gate on rate limits), S3 upload failure (photo confirm step must not leave orphaned partial records).
- **Regression**: every fixed production bug gets a named regression test before the fix is considered done (global CLAUDE.md §5).

## 2. Coverage targets per endpoint (global CLAUDE.md §5)

Every mutating endpoint tests: success path, each validation rule at its min/max boundary, 401 (unauthenticated), 403 (wrong owner / cross-tenant-equivalent / wrong role), 404 (not found / not visible), 409 (conflict, where applicable — e.g., duplicate email), 500 (unexpected failure surfaces a safe generic error, never a stack trace). SQLi/XSS payloads tested at every free-text boundary (bio, message body, report details).

## 3. Invariant test suite (`invariants.spec`, dedicated, run in every CI build)

One test per INV-# in `09-threat-model.md`, written adversarially (attempt the bypass, assert it fails) rather than just asserting the happy path. This suite is the concrete gate that makes ADR-0004's "block/report always wins" a verified fact, not a hope.

## 4. Kill Streak abuse-simulation tests

Dedicated suite simulating: rapid match/unmatch cycling (must not inflate streak), simulated multi-account cluster (must be excluded from streak eligibility via the fraud/risk service stub), grace-window reversal correctness, Shield-insurance absorption correctness.

## 5. Accessibility testing

Automated (axe-core in CI against key pages) + manual keyboard-navigation and screen-reader spot-check before a UI feature is marked complete, per the Visual QA loop in `11-implementation-roadmap.md`.

## 6. Visual QA loop (mandatory, not optional, per project brief)

No UI feature is "done" because it compiles. For every screen: implement → run the dev server → open in browser → visually inspect at the five responsive breakpoints (`03-design-system.md` §6) → exercise interactions → check console/network for errors → fix → re-render → only then mark complete. This is executed via the Browser tool against the actually-running `apps/web` dev server, screenshotting/reading the rendered DOM — never inferred from source code alone.

## 7. CI pipeline gate (see `05-hld.md` and global CLAUDE.md §12)

Lint → typecheck (JSDoc/Zod-based, no TS compiler since this project is plain JS) → unit tests → integration tests (testcontainers) → build → security scan (gitleaks, npm audit) → contract-drift check → (on deploy) migration validation → smoke test. A feature does not merge unless every stage is green.

## 8. Definition of "tested" vs "verified"

Per master-spec §40: "unit tests pass" is not the same as "verified." A feature is verified when its integration/API/E2E tests pass **and**, for UI work, it has actually been rendered and visually inspected in the browser per §6 above. Status reports distinguish these states explicitly (never conflate "implemented" with "verified").
