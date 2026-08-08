# Humble — Threat Model & Critical Invariants

## 1. Method

STRIDE-informed review per module, focused on this product's actual risk concentration: a dating app with a rejection-based game mechanic. Highest-severity concerns are (a) safety-control bypass, (b) account-level harm to a user by another user, (c) financial/entitlement fraud, (d) PII exposure.

## 2. Critical invariants (INV-#) — must have a dedicated automated test each

1. **INV-1 (Block is absolute)**: A blocked user cannot message, be discovered by, or otherwise reach the blocker through any feature, regardless of payment/entitlement/game state. Enforced: block-check runs first, unconditionally, in `MessageService.send` and `DiscoveryService.getCandidates` (LLD §5, §3).
2. **INV-2 (Report is absolute)**: Reporting is never disabled, delayed, or auto-dismissed by any paid feature or game state. Enforced: `ReportService.report()` has no conditional gate.
3. **INV-3 (No account-level harm)**: No feature (Super Reject, Berserker, or any future mechanic) can suspend, log out, hide, or reduce a *third party's* global visibility. Enforced: Super Reject/Berserker redesigns (ADR-0002, ADR-0004) only ever affect the acting user's own resources or the acting pair's mutual state — never a unilateral effect on someone else's account-wide state.
4. **INV-4 (No unauthorized profile modification)**: No feature can write to another user's `Profile`/`ProfilePhoto`/`Preference`. Enforced: Game module has no repository access to those tables (module boundary, ADR-0005).
5. **INV-5 (Client cannot manufacture game state)**: Streak counts, power-up inventory, and entitlements are only ever mutated by server-side service logic triggered by verified events (a confirmed Match, a verified webhook) — never by a client-submitted value. Enforced: all mutating endpoints for these entities take no client-supplied "new value," only trigger IDs (e.g., `matchId`) that the server resolves.
6. **INV-6 (Payment state is provider-verified)**: An entitlement is never granted on the basis of a client claim of payment success — only on a signature-verified Stripe webhook, deduplicated by `providerEventId` (LLD §8).
7. **INV-7 (Sensitive data minimization)**: Public profile projections never include birthdate, email, precise location, or internal risk/moderation fields (LLD §2).
8. **INV-8 (Deleted/suspended users are immediately invisible)**: The instant an account is deleted, suspended, or deactivated, it is excluded from discovery and existing conversations lock — not after a batch job runs.
9. **INV-9 (Moderation actions are auditable)**: Every moderator/admin state-changing action writes an `AuditEvent` in the same transaction — no code path can perform a moderation action without producing an audit row.
10. **INV-10 (Match legitimacy)**: A `Match` row can only be created by the server-side decision-evaluation transaction (LLD §4) — never directly inserted via any admin/debug/test-only endpoint left reachable in production.
11. **INV-11 (Idempotent decisions)**: Submitting the same discovery decision twice never creates two `Match` rows or double-fires domain events.
12. **INV-12 (Humble Match opt-out is honored)**: A user who has set `humbleMatchOptOut` never receives a Humble Match, even if the counterpart wants one.

## 3. STRIDE per module (selected highlights, not exhaustive — full pass repeated before each implementation phase per master-spec §36)

### Auth
- **Spoofing**: credential stuffing → rate limiting + progressive backoff + risk scoring.
- **Tampering**: session fixation → regenerate session ID on login.
- **Repudiation**: login events logged with IP/user-agent for later investigation.
- **Info disclosure**: account-enumeration via registration/password-reset responses → generic responses regardless of existence.
- **DoS**: registration spam → per-IP rate limit + email-domain heuristics.
- **Elevation of privilege**: role escalation via crafted request → role is never client-settable; only mutated by admin action with its own authz check.

### Discovery/Matching
- **Tampering**: crafting a `targetId` that should be excluded (blocked/ineligible) → re-validated server-side on every decision submission (LLD §4), not trusted from a cached client list.
- **Info disclosure**: leaking who liked/rejected whom to the wrong party → decision records are never returned to anyone but the decider; a rejection is never surfaced to its target under any circumstance.
- **DoS**: swipe-spam → rate limiting + fraud/risk scoring feeding Kill Streak eligibility (ADR-0003).

### Messaging
- **Tampering**: sending as another user → object-level participant check every request, session-derived `senderId` only.
- **Info disclosure**: reading a conversation you're not part of via ID guessing → object-level check on every read; UUIDs (non-enumerable) as IDs.
- **DoS**: message spam/harassment → per-conversation and global rate limits + reportability (message-level flag).

### Payments *(post-MVP, designed now)*
- **Tampering**: forged webhook → signature verification mandatory, reject unsigned/invalid.
- **Repudiation**: disputed charge with no record → full `Purchase`/`ProcessedWebhookEvent` audit trail.
- **DoS**: webhook replay → idempotency via `providerEventId` uniqueness.

### Admin
- **Elevation of privilege**: non-moderator hitting admin routes → RBAC guard on every admin controller, tested explicitly (403 for USER role).
- **Repudiation**: moderator denies taking an action → `AuditEvent` is the source of truth, immutable, actor-attributed.

## 4. Abuse scenarios and mitigations (§18 of master spec)

| Abuse | Mitigation |
|---|---|
| Spam/mass messaging | Per-conversation + global rate limits, message-level reporting |
| Fake accounts / bot swiping | Email verification, behavioral risk scoring, CAPTCHA-equivalent challenge above a risk threshold |
| Account farming for streak/rewards | Fraud/risk-cluster check gates Kill Streak eligibility (ADR-0003); device/IP clustering signals |
| Streak farming via unmatch cycling | 24h grace window + reversal logic (ADR-0003) |
| Payment abuse (stolen cards, chargebacks) | Stripe Radar (provider-side), entitlement revocation on dispute webhook |
| Revenge reporting | Reports never auto-action; human moderator review required for any punitive outcome; pattern of reports against a single high-trust account is a signal, not an automatic verdict |
| Report abuse to silence a user | Same as above — no auto-action; reporter identity never revealed to the reported party |
| Block evasion (new account to re-approach a blocker) | Post-MVP enhancement: device/contact-hash cross-referencing; MVP relies on reporting + account-level history; documented as a known MVP limitation, not silently ignored |
| Impersonation via stolen photos | Report category exists; reverse-image search is a documented post-MVP gap (see PRD FR-02) |
| Manipulation of game mechanics (multi-accounting) | Shared fraud/risk service consulted by Game and Payments modules |

## 5. Data classification & privacy

- **PII**: email, birthdate, precise location, payment identifiers — encrypted at rest (RDS encryption), never logged, never in analytics events beyond a hashed/pseudonymous actor ID where needed.
- **Pseudonymous**: userId-keyed behavioral events (swipes, messages metadata) — used for analytics, not exposed cross-user.
- **Public**: name, age (derived, not raw birthdate), bio, photos, city-level location — exactly the public-view projection in LLD §2.

## 6. Secrets management

All secrets (DB credentials, Stripe keys, S3 credentials, session secret) via environment variables injected at deploy time (AWS Secrets Manager / SSM Parameter Store in production, `.env` — gitignored — locally). Never committed. CI includes a secret-scanning step (gitleaks/trufflehog) per global CLAUDE.md §12.
