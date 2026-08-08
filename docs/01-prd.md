# Humble — Product Requirements Document (PRD)

Status: Draft v1. Supersedes nothing (greenfield). See `00-product-discovery.md` for rationale behind redesigned mechanics and `docs/adr/*` for individual decisions.

## 1. Product overview

Humble is a web-first (mobile-responsive) dating application where mutual rejection between two users creates a "Humble Match" alongside the traditional mutual-like "Normal Match." A light game layer (streaks, power-ups, boosted visibility) sits on top of the dating core to make the swipe loop more engaging and shareable, without ever compromising user safety.

## 2. Goals

- G1: Validate that mutual-rejection matching produces engagement (conversation starts) comparable to or exceeding normal matches (H1–H3).
- G2: Ship a safe, trustworthy dating core (profiles, discovery, messaging, block, report, moderation) to a standard users expect from any dating app.
- G3: Establish the game-mechanic identity (Kill Streak at MVP; power-ups/Berserker/Shields post-MVP) without any mechanic compromising safety invariants.
- G4: Build on an architecture that supports rapid iteration by a very small team, with a clear extraction path to services if scale demands it.

## 3. Non-goals

See `00-product-discovery.md` §6. Notably: no native apps, no video/voice, no ML-based recommendations, no literal profile takeover, no mechanic that removes a user's app access, at MVP.

## 4. Personas

**P1 — "The Regular"**: 24–32, uses 1–2 dating apps casually, has swipe fatigue, is drawn to Humble by the joke/marketing, wants genuine connection but appreciates not taking it too seriously.

**P2 — "The Bit Player"**: 20–27, extremely online, downloads Humble primarily for the meme/social-share value, may not be deeply serious about dating initially but is a strong growth/virality driver (screenshots achievement cards, shares Humble Match stories).

**P3 — "The Skeptic"**: 27–35, burned out on dating apps, initially dismissive of "gimmicks," needs the dating fundamentals (profile quality, real conversations, safety) to be excellent before the game layer earns any goodwill.

**P4 — Trust & Safety Moderator (internal)**: Reviews reports, manages appeals, needs efficient tooling and full audit trails.

## 5. User journeys (summary — full flows in `02-user-journeys-state-machines.md`)

1. New user: signup → age gate → profile creation → preferences → discovery.
2. Discovery → Like/Reject → outcome (no match / Normal Match / Humble Match).
3. Normal Match → conversation.
4. Humble Match → dramatized reveal → conversation.
5. Block/Report → safety enforcement.
6. Account deletion → data lifecycle.
7. (Post-MVP) Super Reject, Shield consumption, Kill Streak reward claim, Berserker activation, Profile Takeover Challenge.

## 6. Functional requirements

Each feature below specifies purpose, actor(s), preconditions, flow, success/failure states, edge cases, abuse cases, analytics events, and acceptance criteria. IDs are stable identifiers referenced from tasks/tests.

---

### FR-01 Authentication & Account

**Purpose**: Let a user create and access an account securely.
**Actor**: Anonymous visitor → User.
**Preconditions**: None.
**Flow**: Email + password signup (bcrypt/argon2 hashed, never stored plaintext) OR OAuth (Google) → email verification required before discovery access → session issued (HTTP-only secure cookie, server-side session store) → login on return visits.
**Success**: Verified session; user routed to onboarding if profile incomplete, else discovery.
**Failure**: Invalid credentials (401), unverified email blocks discovery access with a clear resend-verification path, rate-limited after N failed attempts (progressive backoff).
**Edge cases**: Duplicate email signup attempt (409, generic "check your email" message to avoid account enumeration), password reset flow, session expiry mid-action (re-auth prompt preserving in-progress state where feasible).
**Abuse cases**: Credential stuffing (rate limit + CAPTCHA-equivalent risk scoring after threshold), disposable-email signup spam (basic domain denylist + email verification requirement), bot signups (behavioral risk scoring feeding the shared fraud/risk service used across Kill Streak/messaging).
**Analytics**: `UserRegistered`, `EmailVerified`, `LoginSucceeded`, `LoginFailed`.
**Acceptance criteria**: Cannot reach discovery without verified email + complete-enough profile (see FR-02); passwords never logged or returned in any API response; session cookie is `HttpOnly`, `Secure`, `SameSite=Lax`.

---

### FR-02 Profile Management

**Purpose**: Let a user present themselves for discovery.
**Actor**: User.
**Preconditions**: Verified account.
**Flow**: Name, birthdate (18+ enforced server-side, immutable after verification), gender, orientation/preference, bio (≤500 chars, HTML-stripped), up to 6 photos (uploaded to S3 via signed URL, server-side image validation: magic-byte check, max 10MB, allowed types jpg/png/webp, NSFW/moderation scan queued async), location (city-level precision stored; precise geo never exposed to other users — see Privacy §11).
**Success**: Profile marked `complete` once minimum fields + ≥1 photo present; becomes eligible for discovery.
**Failure**: Validation errors returned per-field (see `06-lld.md` validation schemas).
**Edge cases**: Photo moderation flags a photo post-upload → photo hidden pending review, user notified, profile remains usable with remaining photos if any.
**Abuse cases**: Uploading illegal/abusive imagery (async scan + human review queue + immediate takedown + account risk flag), profile impersonation using someone else's photos (report category exists; reverse-image-search integration is a post-MVP enhancement, logged as a known gap).
**Analytics**: `ProfileCompleted`, `ProfileUpdated`, `PhotoUploaded`, `PhotoModerationFlagged`.
**Acceptance criteria**: A profile below minimum completeness never appears in another user's discovery feed; server re-validates age from birthdate on every read (never trusts a cached "is18Plus" flag from the client).

---

### FR-03 Discovery

**Purpose**: Surface candidate profiles to decide on.
**Actor**: User.
**Preconditions**: Complete profile, active session.
**Flow**: Candidate query excludes: self, already-decided-on (like/reject in last N days per policy), blocked (either direction), reported-and-hidden, incomplete profiles, users outside stated preference (gender/age range/distance). Cursor-paginated batches (default 20). Card shown → user decides.
**Success**: A ranked, safety-filtered batch of candidates returned.
**Failure**: Empty batch → "you're all caught up" empty state with a suggestion to widen preferences.
**Edge cases**: Candidate pool exhausted in a small market → widen radius/relax non-critical filters automatically with user-visible indication ("showing people a bit further away").
**Abuse cases**: Scraping the discovery feed via automation (rate limiting per session/IP/account; response payload excludes any field not needed for card rendering — e.g., no raw coordinates, no email).
**Analytics**: `DiscoverySessionStarted`, `ProfileViewed`.
**Acceptance criteria**: A blocked or blocking user's profile never appears to the other party, verified by an explicit test (`blocked-users-never-shown.spec`).

---

### FR-04 Like / Reject (decision)

**Purpose**: Core swipe decision.
**Actor**: User A on candidate B.
**Preconditions**: B is a valid current candidate for A.
**Flow**: A submits `LIKE` or `REJECT` for B. Server records `DiscoveryDecision(A→B)`. Server checks for B's prior decision on A:
  - If none yet: no match, decision stored, A moves to next candidate.
  - If B→A = `LIKE` and A→B = `LIKE`: **Normal Match** created (FR-05).
  - If B→A = `REJECT` and A→B = `REJECT`: **Humble Match** created (FR-06).
  - If decisions disagree (one like, one reject, in either order): no match; no notification to either party (rejection has dignity — product principle #2).
**Success**: Decision persisted idempotently (unique constraint on `(deciderId, targetId)`); match created if applicable.
**Failure**: Duplicate decision on same candidate is a no-op (idempotent), not an error.
**Edge cases**: A and B decide within the same millisecond (race) — handled via DB unique constraint + transaction, second writer's transaction detects the first's row and proceeds to match-creation logic rather than erroring.
**Abuse cases**: Rapid-fire scripted decisions (rate limit per minute; velocity anomaly feeds fraud/risk score, also gates Kill Streak eligibility per ADR-0003).
**Analytics**: `LikeCreated`, `RejectCreated`, `MutualLikeDetected`, `MutualRejectDetected`.
**Acceptance criteria**: Match creation is atomic and server-only; client never receives a "match" state it manufactured itself — it always comes from the decision-submission response or a subsequent fetch.

---

### FR-05 Normal Match

**Purpose**: Standard mutual-like outcome.
**Flow**: On `MutualLikeDetected`, create `Match(type=NORMAL, userA, userB, createdAt)`, both users notified (push/in-app), conversation becomes available per `ConversationPolicy` (FR-09).
**Analytics**: `MatchCreated`.
**Acceptance criteria**: Exactly one `Match` row per unordered pair, enforced by a unique constraint on `(least(userA,userB), greatest(userA,userB))`.

---

### FR-06 Humble Match

**Purpose**: The signature mutual-rejection outcome.
**Flow**: On `MutualRejectDetected`, create `Match(type=HUMBLE, ...)`. Reveal is mutual/per-user-triggered per ADR-0006. Conversation becomes available per `ConversationPolicy`, with a special first-message prompt ("Ask why they rejected you").
**Edge cases**: A user disables Humble Match participation entirely in settings (see FR-19 Preferences) — if either party has disabled it, a mutual reject never creates a Humble Match for that pair (silently treated as two independent rejects, no match, no notification).
**Abuse cases**: A user deliberately mass-rejecting to farm Humble Matches — no meaningful abuse vector since rejection is already the "give up" action and provides no benefit unless the other party independently also rejected; monitored anyway via the same fraud/risk pipeline.
**Analytics**: `HumbleMatchCreated`, `HumbleMatchRevealed` (see ADR-0006).
**Acceptance criteria**: A user who disabled Humble Matches never receives one, verified by test.

---

### FR-07 Super Reject *(Post-MVP, safe-redesigned per ADR-0002)*

**Purpose**: Dramatized, scarce version of Reject for the sender's own experience.
**Flow**: User consumes 1 Super Reject charge (regenerates over time / earnable) instead of a normal Reject. Functionally identical to Reject server-side (permanent mutual discovery exclusion) plus sender-only VFX/copy. No effect on recipient's account, visibility to others, or app access.
**Abuse cases**: Charge farming via multi-accounting (rate-limited by the same fraud/risk service; charges tied to verified, non-clustered accounts).
**Analytics**: `SuperRejectActivated`.
**Acceptance criteria**: Recipient's account state (session validity, visibility to third parties, ability to use any feature) is provably unaffected — covered by an explicit invariant test.

---

### FR-08 Shields *(Post-MVP, redesigned per ADR-0002)*

**Purpose**: Positive consumable currency.
**Flow**: Acquired via purchase (Stripe) or free-earn (streak milestones, daily engagement). Consuming one at decision-time: suppresses "you got rejected" signaling (already suppressed by default per product principle #2 — so in practice this maps to reserving one for streak insurance) and/or protects a Kill Streak increment from reversal (ADR-0003).
**Acceptance criteria**: Entitlement balance is server-authoritative; purchase grants only occur after Stripe webhook verification (see FR-16).

---

### FR-09 Messaging / Conversation Policy

**Purpose**: Configurable, safety-respecting conversation initiation and messaging.
**Actor**: Matched users.
**Preconditions**: An active, non-blocked `Match`.
**Flow**: A `ConversationPolicy` (per-match-type, configurable, not hard-coded to gender) determines: who may send the first message, the initiation window (default 24h before match expires if unused), messaging rate limits, and whether a paid exception (Berserker, post-MVP) grants initiation permission outside the default rule. Realtime delivery via Socket.IO; offline delivery via push/in-app badge + eventual pull.
**Failure**: Sending to a blocked counterpart → 403, always, regardless of any entitlement (INV-1).
**Edge cases**: Match expires unused (no message sent within window) → match moves to `EXPIRED` state, conversation becomes read-only/archived, no further messages allowed (reactivation is a distinct explicit action, not automatic).
**Abuse cases**: Spam/mass-messaging (per-conversation and global rate limits), harassment content (message-level reporting, keyword/heuristic flagging feeding moderation queue).
**Analytics**: `MessageSent`, `ConversationStarted`.
**Acceptance criteria**: Every message send path checks the block list first, unconditionally, before any policy/entitlement logic (INV-1, see threat model).

---

### FR-10 Kill Streak *(MVP — see ADR-0003 for full state machine)*

**Purpose**: Reward consecutive engagement with the core loop.
**Acceptance criteria**: Streak count only increases via server-confirmed qualifying matches; farming via unmatch-spam or multi-accounting is neutralized by the grace-window + risk-cluster checks (verified by dedicated abuse-simulation tests).

---

### FR-11 Power-Ups *(Post-MVP)*

**Purpose**: Explicit gameplay reward domain (Shield, Boost, Streak Multiplier, Spotlight, Match Reveal).
**Acceptance criteria**: Modeled as `PowerUp`/`InventoryItem`/`Entitlement` entities (never scattered flags); every consumption is a server-side transaction with an audit trail.

---

### FR-12 Berserker Mode *(Post-MVP — see ADR-0004)*

**Purpose**: Paid visibility + initiation-permission boost.
**Acceptance criteria**: Block/Report unconditionally override Berserker state (INV-1/INV-2); no immunity of any kind.

---

### FR-13 Profile Takeover Challenge *(Post-MVP — see ADR-0005)*

**Purpose**: Safe, sandboxed comedic mechanic.
**Acceptance criteria**: Zero write access to the real `Profile` entity; curated content only; instantly dismissible by the affected user.

---

### FR-14 Blocking

**Purpose**: Absolute, unconditional user-controlled safety mechanism.
**Flow**: User A blocks User B → B immediately removed from A's discovery and A's from B's, any active match/conversation between them is closed to new messages (history retained per data-retention policy for potential moderation review), B cannot re-appear to A via any surface (search, discovery, shared match suggestions).
**Acceptance criteria**: INV-1 — no feature of any kind can prevent, delay, or reverse a block. Blocking is idempotent and reversible only by the blocker (unblock), never by the blocked party.
**Analytics**: `UserBlocked`.

---

### FR-15 Reporting

**Purpose**: Absolute, unconditional path into moderation.
**Flow**: User reports another with a category (harassment, fake profile, inappropriate content, spam, safety concern, other) + optional evidence (message IDs, photo IDs, free-text). Creates `ModerationCase(status=OPEN)`. Reporting a user does not itself block them (separate, additive action) but the UI always offers both together.
**Acceptance criteria**: INV-2 — no feature can prevent, mute, or auto-dismiss a report. Reports always enter the moderation queue; automation may only *prioritize*, never *discard*.
**Analytics**: `UserReported`, `ModerationCaseCreated`.

---

### FR-16 Payments & Entitlements *(Post-MVP for Shields/Berserker; architecture designed at MVP time)*

**Purpose**: Real financial subsystem, never client-trusted.
**Flow**: Client requests Stripe Checkout session → Stripe handles payment → Stripe webhook (signature-verified) → server verifies event authenticity + idempotency key → creates `Purchase` record → grants `Entitlement`/`InventoryItem`. Refunds/chargebacks processed via webhook → entitlement reconciliation (revoke unused portion where feasible, flag account if entitlement already consumed).
**Acceptance criteria**: A "payment succeeded" claim from the client is never sufficient to grant anything (INV covered in threat model); duplicate webhook delivery is idempotent (no double-grant).

---

### FR-17 Moderation & Admin

**Purpose**: Internal tooling for trust & safety.
**Flow**: Moderator views `ModerationCase` queue (prioritized by risk score/severity), reviews evidence, takes action (warn, hide content, suspend, ban, dismiss), all actions logged to `AuditEvent` with moderator identity, timestamp, reason. Appeals create a linked case for secondary review.
**Acceptance criteria**: Every admin action is authenticated, authorized (RBAC: moderator vs. admin), and audited — no silent/untraceable action possible.

---

### FR-18 Notifications

**Purpose**: Keep users informed without spam.
**Flow**: In-app notification center (MVP) + email for critical events (verification, moderation outcomes, password reset) + browser push (opt-in) for matches/messages. Mobile push deferred to native-app phase.
**Acceptance criteria**: User-controllable notification preferences; safety-critical emails (moderation, account security) cannot be disabled.

---

### FR-19 Preferences & Settings

**Purpose**: User control over discovery criteria and feature participation.
**Flow**: Age range, distance, gender/orientation preference, Humble Match opt-out toggle, notification preferences, account deletion request.
**Acceptance criteria**: Preference changes take effect on the next discovery query; opt-out flags are enforced server-side, never client-filtered only.

---

### FR-20 Account Lifecycle & Deletion

**Purpose**: Respect user control over their data.
**Flow**: Deactivate (soft, reversible, hidden from discovery immediately) vs. Delete (hard request → grace period → irreversible anonymization/removal per data-retention policy, matches/messages with counterparts retained in anonymized form only if needed for moderation history, else purged).
**Acceptance criteria**: A deleted account never appears in another user's discovery or search, immediately upon deletion request (not after grace-period expiry) — verified by test (INV-8).

---

### FR-21 Analytics & Feature Flags

**Purpose**: Measure hypotheses, enable safe rollout.
**Flow**: Server-side event emission for all events listed per-feature above; feature flags gate Kill Streak/Power-ups/Berserker/Takeover rollout independently (kill-switch capability for any game mechanic without a deploy).
**Acceptance criteria**: Every analytics event has a documented privacy classification (see Privacy section) and purpose; no event captures more PII than needed.

---

## 7. Non-functional requirements

- **Availability**: MVP target 99.5% (single-region, small-scale; formal SLO tightens post-MVP).
- **Latency**: Discovery card fetch P95 < 300ms; message delivery (online recipient) < 1s end-to-end via WebSocket.
- **Security**: OWASP Top 10 mitigations mandatory (see threat model); all traffic HTTPS; secrets never committed (env vars only).
- **Data integrity**: Match/streak/entitlement state is server-authoritative; client is never trusted for anything financially or competitively meaningful.
- **Privacy**: Precise location never exposed to other users (city/distance-bucket only); data retention/deletion per FR-20.
- **Accessibility**: WCAG 2.1 AA target for core flows (see `03-design-system.md`).
- **Observability**: Structured logs, request/correlation IDs, health/readiness endpoints from day one (see `05-hld.md`).

## 8. MVP scope (authoritative)

**In scope**: FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-09 (basic policy, one default configuration), FR-10 (Kill Streak, counter + milestone reward as a simple badge — full Power-Up inventory is post-MVP), FR-14, FR-15, FR-17 (basic queue + actions, no advanced risk scoring UI yet), FR-18 (in-app + email only), FR-19, FR-20, FR-21 (core funnel events only).

**Out of scope for MVP** (Phase 2/3 per roadmap): FR-07 Super Reject, FR-08 Shields, FR-11 Power-Ups (beyond the single Kill Streak milestone badge), FR-12 Berserker Mode, FR-13 Profile Takeover Challenge, FR-16 full payments infra (design is documented now; implementation deferred until Phase 2 monetization is approved — see open question in discovery doc).

## 9. Acceptance criteria summary

MVP is done when: a new user can sign up, complete a profile, discover others, like/reject, receive both a Normal Match and a Humble Match in test scenarios, message a match under the default conversation policy, block and report another user with immediate effect, and a moderator can see and act on a report — all covered by automated tests per `10-testing-strategy.md`, with no failing invariant test.
