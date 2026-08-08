# Backend rules (Humble — apps/api)

- NestJS, JavaScript (no TS), modular monolith per `docs/05-hld.md`/`docs/06-lld.md`. Modules: auth, users, profiles, discovery, matching, messaging, game, powerups, payments, safety, notifications, analytics, admin.
- Controller → Service → Repository (Prisma) layering. Controllers never touch Prisma directly. No cross-module repository imports — go through the owning module's service.
- Every mutating endpoint: Zod-validated input, object-level authorization (never trust a client-supplied ownership/user ID), RFC 7807 error responses, correlation ID propagation.
- Safety-critical order of operations in Messaging (block check first, always) and Discovery (exclusions never relaxed) — see `docs/06-lld.md` §3/§5 — is not to be refactored without re-running `invariants.spec`.
- Payments/entitlements: server/webhook-verified only, idempotent on `providerEventId`, never client-granted (`docs/06-lld.md` §8, INV-6).
- Prisma migrations only; see global CLAUDE.md §15–19 and this repo's zero-exceptions stance in the project `CLAUDE.md`.
