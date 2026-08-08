# Humble — Domain Model

## 1. Bounded contexts (map to NestJS modules, ADR-0001)

| Context | Owns | Depends on |
|---|---|---|
| Identity & Access (`auth`) | User credentials, sessions | — |
| Profile (`profiles`) | Profile, ProfilePhoto, Preference | Identity |
| Discovery (`discovery`) | DiscoveryDecision, candidate ranking | Profile, Safety (block filtering) |
| Matching (`matching`) | Match, ConversationPolicy | Discovery, Safety |
| Messaging (`messaging`) | Conversation, Message | Matching, Safety |
| Game (`game`) | KillStreak, PowerUp, InventoryItem, TakeoverBadge | Matching, Fraud/Risk |
| Payments (`payments`) | Purchase, Entitlement | Identity, Game |
| Safety (`safety`) | Block, Report, ModerationCase, AuditEvent, FraudRiskScore | Identity |
| Notifications (`notifications`) | Notification, delivery preferences | all producers (event-driven) |
| Analytics (`analytics`) | AnalyticsEvent sink | all producers (event-driven) |
| Admin (`admin`) | Admin-facing composition of Safety/Payments/Game views | Safety, Payments, Game |

Module boundary rule: a module may only read/write another module's data through that module's public service interface — never a direct repository import across module lines. This is the concrete mechanism that keeps the monolith extractable later (ADR-0001).

## 2. Core entities (see `07-database-design.md` for full schema)

- **User** — credentials, verification state, role (user/moderator/admin), lifecycle state.
- **Profile** — display identity: name, birthdate, gender, orientation/preference, bio, location (city-level), completeness flag.
- **ProfilePhoto** — S3 reference, order, moderation status.
- **Preference** — age range, max distance, gender preference, humbleMatchOptOut flag.
- **DiscoveryDecision** — (deciderId, targetId, decision: LIKE|REJECT, createdAt), unique per pair.
- **Match** — (userAId, userBId normalized low/high, type: NORMAL|HUMBLE, status, createdAt), unique per unordered pair.
- **ConversationPolicy** — configurable rule set (not hard-coded to gender): who may initiate per match type, initiation window, paid-exception rules.
- **Conversation** — 1:1 with Match, status.
- **Message** — conversationId, senderId, body, status (sent/delivered/read/flagged), createdAt.
- **Block** — (blockerId, blockedId, createdAt) — directional, checked both ways at query time.
- **Report** — reporterId, reportedId, category, evidence refs, createdAt → **ModerationCase**.
- **ModerationCase** — status, assignedModeratorId, resolution, resolvedAt.
- **AuditEvent** — actorId (admin/moderator), action, targetType/targetId, timestamp, metadata — immutable append-only.
- **FraudRiskScore** — userId, score, signals, updatedAt — consumed by Discovery (rate limiting), Game (streak eligibility), Auth (signup risk).
- **KillStreak** — userId, count, status (PENDING increments tracked via StreakEvent), lastQualifyingAt.
- **StreakEvent** — streakId, matchId, state (PENDING|CONFIRMED|REVERSED), graceExpiresAt.
- **PowerUp** *(post-MVP)* — catalog entity (type, effect descriptor).
- **InventoryItem** *(post-MVP)* — userId, powerUpId/shieldType, quantity.
- **Entitlement** *(post-MVP)* — userId, type (BERSERKER, etc.), expiresAt, sourcePurchaseId.
- **Purchase** *(post-MVP)* — userId, provider(Stripe), providerRef, amount, status, idempotencyKey.
- **TakeoverBadge** *(post-MVP)* — curated content catalog entity; **never** references or writes Profile.
- **Notification** — userId, type, payload, readAt.
- **AnalyticsEvent** — name, actorId, entityRef, metadata, privacyClass, createdAt.

## 3. Domain events (event-driven design, §16 of master spec)

Emitted internally (in-process event bus within the monolith — e.g., NestJS `EventEmitter2` — promotable to a real broker later without changing producers/consumers' contracts):

`UserRegistered`, `EmailVerified`, `ProfileCompleted`, `ProfileViewed`, `LikeCreated`, `RejectCreated`, `MutualLikeDetected`, `MutualRejectDetected`, `MatchCreated`, `HumbleMatchCreated`, `HumbleMatchRevealed`, `SuperRejectActivated`, `ShieldConsumed`, `KillStreakStarted`, `KillStreakCompleted`, `KillStreakReversed`, `PowerUpGranted`, `BerserkerActivated`, `MessageSent`, `ConversationStarted`, `UserBlocked`, `UserReported`, `ModerationCaseCreated`, `ModerationCaseResolved`, `PaymentCompleted`, `PaymentRefunded`, `SubscriptionActivated`, `AccountDeactivated`, `AccountDeleted`.

Consumers: `notifications` (most events → push/in-app/email), `analytics` (all events → event sink), `game` (Match events → streak evaluation).

Rule: events are used where they decouple a side-effect from the primary transaction (e.g., "send a notification" should never be able to fail or slow down "create the match"). They are **not** used to fake distributed-transaction consistency for data that must be strongly consistent within one request (e.g., decrementing an inventory count when consuming a Shield happens in the same DB transaction as the action it enables, not via eventual-consistency events).

## 4. Aggregates & transactional boundaries

- **Decision→Match aggregate**: submitting a `DiscoveryDecision` and evaluating/creating a resulting `Match` happens in a single DB transaction (serializable isolation on the pair lookup to prevent double-match races).
- **Streak aggregate**: `StreakEvent` creation/reversal is transactional with the triggering Match state change.
- **Entitlement aggregate**: `Purchase` confirmation and `Entitlement`/`InventoryItem` grant happen in a single transaction driven only by verified webhook processing, keyed by idempotency key.
- **Block aggregate**: `Block` creation, discovery-exclusion effect, and conversation lock are one transaction — there is no window where a block is "half applied."

## 5. Authorization model (summary — detail in `06-lld.md` and `09-threat-model.md`)

Object-level authorization required on every entity accessed via ID: a user may only read/write their own `Profile`/`Preference`, only act on a `Match`/`Conversation` they are a participant of, only moderators/admins may touch `ModerationCase`/`AuditEvent` write paths. Ownership is derived from the authenticated session's user ID — **never** from a client-supplied `userId`/`tenantId`-style field.
