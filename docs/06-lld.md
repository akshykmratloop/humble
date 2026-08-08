# Humble — Low-Level Design (LLD)

Scope: MVP modules in full detail; post-MVP modules (Payments, Game power-ups, Berserker, Takeover) sketched at the level needed to validate the domain model now, detailed further immediately before their implementation phase (per master-spec change-management rule: don't design far ahead of need, but don't leave contradictions either).

Conventions used throughout: JavaScript (no TypeScript) + Zod for runtime validation/shape documentation (Zod schemas serve as the "type" contract the global CLAUDE.md §6/§10 rules require in lieu of TS interfaces). NestJS modules follow `controller → service → repository (Prisma)` layering; controllers never touch Prisma directly.

## 1. Auth module

**Entities**: `User` (via Prisma).
**Services**: `AuthService` (register, login, verifyEmail, requestPasswordReset, resetPassword, logout, logoutAllSessions), `SessionService` (create/validate/revoke session in Redis).
**Controllers**: `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/logout`, `POST /v1/auth/verify-email`, `POST /v1/auth/password-reset/request`, `POST /v1/auth/password-reset/confirm`, `GET /v1/auth/session`.
**Commands**: `RegisterUserCommand`, `VerifyEmailCommand`.
**Validation (Zod)**: `email` (5–254 chars, RFC-shape, lowercased/trimmed), `password` (12–128 chars, strength-checked — reject top-10k common passwords), `birthdate` (must yield age ≥18, checked server-side on registration and re-checked on every profile read).
**Authorization**: registration/login are public; all other routes require a valid session.
**Transactions**: `User` row creation is a single insert; email verification token stored hashed with expiry.
**Idempotency**: duplicate registration with same email returns a generic "check your email" response regardless of whether the account exists, to prevent account enumeration, but does not create a duplicate row (unique constraint on email).
**Retries/failure handling**: password hashing (argon2id) is CPU-bound but not retried; downstream email-send failure is queued for retry via the notification module's own retry policy, does not fail the registration transaction.
**Rate limiting**: login attempts limited per-IP and per-account with exponential backoff; registration limited per-IP.

## 2. Profiles module

**Entities**: `Profile`, `ProfilePhoto`, `Preference`.
**Services**: `ProfileService` (create/update/getOwn/getPublicView), `PhotoService` (requestUploadUrl, confirmUpload, reorder, delete), `PreferenceService`.
**Controllers**: `GET/PATCH /v1/profiles/me`, `GET /v1/profiles/:id` (public view, filtered fields), `POST /v1/profiles/me/photos/upload-url`, `POST /v1/profiles/me/photos/:id/confirm`, `DELETE /v1/profiles/me/photos/:id`, `PATCH /v1/profiles/me/photo-order`, `GET/PATCH /v1/preferences/me`.
**Validation**: `name` (1–80 chars, Unicode-aware, HTML-stripped), `bio` (≤500 chars, HTML-stripped), `photos` (≤6, magic-byte + size validated server-side after S3 upload via a HEAD/metadata check — never trust client-declared MIME type).
**Authorization**: a user may only mutate their own `Profile`/`Preference`/`ProfilePhoto` — enforced by scoping every query to `where: { userId: session.userId }`, never by trusting a body/param `userId`.
**Public view field filtering**: `getPublicView` returns an explicit allow-list projection (name, age-derived-from-birthdate, bio, photos, city-level location) — birthdate, email, precise location, and internal flags are never serialized, enforced via a dedicated DTO mapper, not by "just not rendering it on the frontend."
**Events emitted**: `ProfileCompleted` (on first transition to complete), `ProfileUpdated`, `PhotoUploaded`.
**Failure handling**: photo upload uses a two-step signed-URL pattern (`requestUploadUrl` → client uploads directly to S3 → `confirmUpload` triggers server-side validation + async moderation scan); an unconfirmed upload auto-expires and is never linked to the profile.

## 3. Discovery module

**Services**: `DiscoveryService.getCandidates(userId, cursor, limit)`.
**Query composition** (all server-side, never client-filterable):

```
candidates = Profile
  WHERE complete = true
    AND userId != self
    AND userId NOT IN (already-decided by self)
    AND userId NOT IN (blocked either direction — subquery against Block)
    AND userId NOT IN (deactivated/deleted/suspended)
    AND gender/orientation MATCHES self.preference (and vice versa, if mutual-preference model chosen)
    AND age BETWEEN self.preference.ageMin AND ageMax
    AND distance(self.location, candidate.location) <= self.preference.maxDistance
  ORDER BY rankingScore DESC  -- MVP: recency + completeness heuristic, no ML
  LIMIT :limit
```

**Authorization**: implicit — a user can only ever request their own candidate feed (`self` = session user).
**Abuse controls**: per-session/per-account rate limit on candidate-fetch frequency; response DTO excludes raw coordinates (only a pre-bucketed distance label).
**Events**: `ProfileViewed` (fired client-confirmed, i.e., when a card is actually rendered, batched to avoid a request per card).
**Failure handling**: empty result set triggers a documented relaxation order (widen distance → widen age range → note: never relax the block/safety exclusions, which are non-negotiable regardless of pool size).

## 4. Matching module

**Services**: `DecisionService.submit(deciderId, targetId, decision)`, `MatchService` (internal, invoked by DecisionService).
**Core transaction** (serializable isolation):

```
BEGIN
  UPSERT DiscoveryDecision(deciderId, targetId, decision) -- idempotent on conflict, no-op if same value
  SELECT reverse DiscoveryDecision(targetId, deciderId) FOR UPDATE
  IF reverse exists AND reverse.decision == decision:
     matchType = (decision == LIKE) ? NORMAL : HUMBLE
     IF matchType == HUMBLE AND (self.pref.humbleMatchOptOut OR target.pref.humbleMatchOptOut):
        -- no match created; treated as two independent decisions
     ELSE:
        INSERT Match(...) ON CONFLICT (pair) DO NOTHING -- guards the race case
        EMIT MutualLikeDetected | MutualRejectDetected, MatchCreated | HumbleMatchCreated
COMMIT
```

**Authorization**: `deciderId` is always the session user; `targetId` must be a currently-valid candidate for that user (re-validated server-side against the same exclusion rules as Discovery, not trusted from the request body) to prevent deciding on a blocked/ineligible profile via a crafted request.
**Idempotency**: re-submitting the same decision is a no-op; submitting the _opposite_ decision after an initial one is currently disallowed for MVP (a decision is final) — documented as a product decision, revisit if user feedback demands "undo."
**Concurrency**: the `FOR UPDATE` row lock + unique constraint on `Match(leastId, greatestId)` prevents double-match creation when both users decide near-simultaneously.
**ConversationPolicy** (config, not hard-coded): a `PolicyResolver` service determines initiation permission per match; MVP ships one default policy (either party may send the first message, 7-day initiation window) to avoid over-building the gendered-policy configurability before it's validated as needed — the entity model supports richer policies (see FR-09) without requiring MVP to use them.

## 5. Messaging module

**Entities**: `Conversation`, `Message`.
**Services**: `ConversationService`, `MessageService.send(senderId, conversationId, body)`, `ChatGateway` (Socket.IO).
**Send-message flow** (order matters — this is the concrete implementation of INV-1):

```
1. Load Conversation, verify sender is a participant (object-level authz)
2. Check Block: is either participant blocking the other? -> if yes, 403, stop. ALWAYS FIRST.
3. Check Conversation/Match status (must be Active, not Closed/Expired/Locked)
4. Check ConversationPolicy initiation rules (first-message-sender permission) if this is the first message
5. Check rate limit (per-conversation, per-account)
6. Validate & sanitize message body (length, strip control chars)
7. Persist Message (status=sent)
8. Emit MessageSent event (-> analytics, notification)
9. Broadcast via Socket.IO to recipient if connected
```

**Authorization**: object-level check in step 1 on every call, not just at the gateway-connection level.
**Failure handling**: DB write failure → send fails, client sees error, no partial broadcast; broadcast failure (recipient socket errored) does not roll back the persisted message — delivery is at-least-once via the durable row, socket is best-effort real-time delivery only.

## 6. Safety module (Block / Report / Moderation / Fraud)

**Services**: `BlockService.block(blockerId, blockedId)` / `.unblock(...)`, `ReportService.report(reporterId, reportedId, category, evidence)`, `ModerationService` (admin-facing case management), `FraudRiskService.scoreEvent(...)`.
**BlockService.block()`: single transaction — insert `Block`row, close any active`Conversation`between the pair (status →`Closed`), no exceptions, no feature flag can wrap this call in a conditional. This function is called directly (not via the event bus) from anywhere that needs to check blocking status, so there is no eventual-consistency window.
**ReportService.report()`: single transaction — insert `Report`, insert `ModerationCase(status=OPEN)`, compute initial risk-priority score (heuristic: category severity + reporter/reported history) for queue ordering. Always succeeds if the two users exist; never conditionally rejected by any other module's state.
**Authorization**: any authenticated user may block/report any other user they've interacted with (matched, or seen in discovery, or messaged); moderators/admins have elevated read/write on `ModerationCase`.
**Audit**: every `ModerationService` state-changing method writes an `AuditEvent` (actorId, action, target, reason, timestamp) in the same transaction as the action — never as an afterthought/best-effort log line.

## 7. Game module (MVP: Kill Streak only; full detail per ADR-0003)

**Services**: `StreakService.onMatchCreated(matchId)` (event handler), `StreakService.finalizeExpiredGraceWindows()` (scheduled job, runs every few minutes), `StreakService.onUnmatchOrBlockOrReport(matchId)`.
**Concurrency**: streak increment/decrement is a single-row `UPDATE ... WHERE version = :expectedVersion` (optimistic locking) to avoid lost updates if a user's streak is touched by two events near-simultaneously (e.g., a match and a report resolving at the same time).
**Failure handling**: the scheduled finalize job is idempotent (re-running it on already-finalized `StreakEvent` rows is a no-op) so a missed/duplicated cron run cannot double-count.

## 8. Payments module _(post-MVP — architecture fixed now, implementation later)_

**Services**: `CheckoutService.createSession(...)`, `WebhookService.handleStripeEvent(rawBody, signature)`, `EntitlementService.grant(...)`/`revoke(...)`.
**Webhook handling**: verify signature → check `providerEventId` against a `ProcessedWebhookEvent` table (idempotency, since Stripe redelivers) → if new, process in a transaction that updates `Purchase` and grants `Entitlement`/`InventoryItem` atomically → mark event processed. A failure after "mark processed" but before "grant" is impossible because both happen in one transaction.
**Client contract**: the client never calls an endpoint that says "I paid, give me the item" — the only client-visible payment state is "checkout session created" and "checkout session status" (polled or webhook-driven UI update), matching FR-16/INV rules.

## 9. Notifications module

**Services**: `NotificationService` subscribes to domain events, maps each to a notification record + delivery channel (in-app always; email for a defined critical subset; push post-MVP-native). Delivery failures (e.g., email provider timeout) are retried with backoff via a queue (in-process for MVP scale — a `Bull`/Redis-backed queue is the natural upgrade path, documented as a future ADR if volume demands it, not built speculatively now).

## 10. Analytics module

**Services**: `AnalyticsService.track(eventName, actorId, entityRef, metadata, privacyClass)`. MVP sink: append to an `AnalyticsEvent` table (queryable directly); swappable for a dedicated pipeline (e.g., Segment/warehouse) later without changing producer call sites, since producers depend only on `AnalyticsService`'s interface.

## 11. Admin module

Composition layer over Safety/Payments/Game read models plus write actions that delegate to those modules' services (never duplicates their logic) — e.g., "ban user" calls into `ModerationService`, it doesn't reimplement suspension logic in the admin controller.

## 12. Cross-cutting: validation, error format, idempotency conventions

- All request bodies validated against a Zod schema in a shared `packages/validation` module before reaching a service method.
- Errors returned as RFC 7807 `application/problem+json`: `{ type, title, status, detail, instance, requestId }`.
- Mutating endpoints that are safe to retry (payment webhook handling, some admin actions) accept/require an `Idempotency-Key` header, stored and checked per the payments pattern in §8.
- Every response includes the request's correlation ID (`x-request-id`) echoed back for support/debugging.
