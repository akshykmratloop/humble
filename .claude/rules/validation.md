# Validation rules (Humble)

- Every API input validated by a Zod schema in `packages/validation`, shared/generated for frontend use — no hand-duplicated shape definitions.
- Field floors per global CLAUDE.md §6 (email 5–254, password 12–128 + strength, name 1–80, free-text ≤4000 w/ HTML stripped, etc.), with project-specific tightenings from `docs/06-lld.md` (e.g., bio ≤500, message body ≤4000, birthdate → age ≥18 check server-side, re-checked on every read).
- Sanitization order: trim → normalize case → strip control chars → strip HTML → NFC normalize → size cap.
- Frontend Zod validation is UX only; the NestJS-side schema is the actual security gate — never trust the client copy of a schema.
- Public-view DTOs are explicit allow-list projections (see `docs/06-lld.md` §2) — never "the full entity minus a few fields."
