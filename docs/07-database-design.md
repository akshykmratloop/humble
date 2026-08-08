# Humble — Database Design

Single PostgreSQL database, Prisma ORM (schema authored in `packages/database/prisma/schema.prisma`, implemented in Phase 13). This document is the authoritative pre-implementation design; the actual `.prisma` file must match it (deviations require a doc update first, per master-spec change-management rule).

Convention: every table has `id` (UUID, `@default(uuid())`), `createdAt`, `updatedAt`; user-owned tables that support soft-delete have `deletedAt` (nullable). Money stored as integer cents. Enums used for closed sets. All FKs indexed.

## 1. Identity

```
User
  id              uuid PK
  email           citext UNIQUE NOT NULL
  passwordHash    text NULL              -- null if OAuth-only
  emailVerifiedAt timestamptz NULL
  role            enum(USER, MODERATOR, ADMIN) DEFAULT USER
  status          enum(ACTIVE, DEACTIVATED, PENDING_DELETION, SUSPENDED, BANNED, DELETED) DEFAULT ACTIVE
  createdAt, updatedAt
  deletedAt       timestamptz NULL
  INDEX (status)

OAuthAccount
  id           uuid PK
  userId       uuid FK -> User CASCADE
  provider     enum(GOOGLE)
  providerUid  text
  UNIQUE (provider, providerUid)
  INDEX (userId)

AuthToken                              -- email verification + password reset (LLD §1)
  id          uuid PK
  userId      uuid FK -> User CASCADE
  type        enum(EMAIL_VERIFICATION, PASSWORD_RESET)
  tokenHash   text NOT NULL            -- raw token never stored, only its hash
  expiresAt   timestamptz NOT NULL
  usedAt      timestamptz NULL
  createdAt
  INDEX (userId, type)

Session (Redis-primary; optional Postgres mirror for audit is out of scope for MVP)
```

## 2. Profile

```
Profile
  id           uuid PK
  userId       uuid FK -> User UNIQUE CASCADE
  name         varchar(80) NOT NULL
  birthdate    date NOT NULL
  gender       enum(MAN, WOMAN, NONBINARY, OTHER) NOT NULL
  bio          varchar(500) NULL
  cityLabel    varchar(120) NULL          -- city-level only, never precise coords exposed
  latBucket    numeric(5,2) NULL          -- coarse-rounded for distance calc, not precise
  lngBucket    numeric(5,2) NULL
  isComplete   boolean DEFAULT false
  createdAt, updatedAt, deletedAt
  INDEX (isComplete)
  CHECK (birthdate <= now() - interval '18 years')

ProfilePhoto
  id            uuid PK
  profileId     uuid FK -> Profile CASCADE
  s3Key         text NOT NULL
  order         smallint NOT NULL
  moderationStatus enum(PENDING, APPROVED, REJECTED) DEFAULT PENDING
  createdAt
  UNIQUE (profileId, order)
  INDEX (profileId)

Preference
  id                   uuid PK
  userId               uuid FK -> User UNIQUE CASCADE
  genderPreference      enum(MAN, WOMAN, NONBINARY, OTHER, ANY)[]   -- array, multi-select
  ageMin, ageMax        smallint
  maxDistanceKm         smallint
  humbleMatchOptOut     boolean DEFAULT false
  updatedAt
```

## 3. Discovery & Matching

```
DiscoveryDecision
  id          uuid PK
  deciderId   uuid FK -> User CASCADE
  targetId    uuid FK -> User CASCADE
  decision    enum(LIKE, REJECT) NOT NULL
  createdAt
  UNIQUE (deciderId, targetId)
  INDEX (targetId, decision)      -- fast reverse lookup for match evaluation

Match
  id            uuid PK
  userLowId     uuid FK -> User CASCADE     -- normalized: lexicographically smaller id
  userHighId    uuid FK -> User CASCADE
  type          enum(NORMAL, HUMBLE) NOT NULL
  status        enum(ACTIVE, EXPIRED, UNMATCHED, CLOSED) DEFAULT ACTIVE
  createdAt, updatedAt
  UNIQUE (userLowId, userHighId)
  INDEX (userLowId), INDEX (userHighId), INDEX (status)

ConversationPolicy
  id             uuid PK
  matchType      enum(NORMAL, HUMBLE) UNIQUE
  initiatorRule  enum(EITHER, POLICY_DESIGNATED_PARTY)
  initiationWindowHours smallint DEFAULT 168
  -- MVP seeds one row per matchType with initiatorRule=EITHER
```

## 4. Messaging

```
Conversation
  id         uuid PK
  matchId    uuid FK -> Match UNIQUE CASCADE
  status     enum(AVAILABLE, STARTED, LOCKED) DEFAULT AVAILABLE
  createdAt, updatedAt

Message
  id              uuid PK
  conversationId  uuid FK -> Conversation CASCADE
  senderId        uuid FK -> User
  body            varchar(4000) NOT NULL
  status          enum(SENT, DELIVERED, READ, FLAGGED) DEFAULT SENT
  createdAt
  INDEX (conversationId, createdAt)
```

## 5. Safety

```
Block
  id         uuid PK
  blockerId  uuid FK -> User CASCADE
  blockedId  uuid FK -> User CASCADE
  createdAt
  UNIQUE (blockerId, blockedId)
  INDEX (blockedId)     -- fast "am I blocked by anyone" reverse check

Report
  id           uuid PK
  reporterId   uuid FK -> User
  reportedId   uuid FK -> User
  category     enum(HARASSMENT, FAKE_PROFILE, INAPPROPRIATE_CONTENT, SPAM, SAFETY_CONCERN, OTHER)
  details      text NULL
  createdAt
  INDEX (reportedId), INDEX (reporterId)

ModerationCase
  id             uuid PK
  reportId       uuid FK -> Report UNIQUE
  status         enum(OPEN, IN_REVIEW, RESOLVED_ACTIONED, RESOLVED_DISMISSED, APPEALED)
  assignedModeratorId uuid FK -> User NULL
  priorityScore  smallint DEFAULT 0
  resolution     text NULL
  resolvedAt     timestamptz NULL
  createdAt, updatedAt
  INDEX (status, priorityScore DESC)

AuditEvent   -- append-only, no update/delete path in the application layer
  id          uuid PK
  actorId     uuid FK -> User
  action      varchar(80)
  targetType  varchar(40)
  targetId    uuid
  metadata    jsonb
  createdAt
  INDEX (targetType, targetId), INDEX (actorId)

FraudRiskScore
  id         uuid PK
  userId     uuid FK -> User UNIQUE
  score      smallint DEFAULT 0
  signals    jsonb
  updatedAt
```

## 6. Game (Kill Streak = MVP; rest post-MVP, schema fixed now to avoid rework)

```
KillStreak
  id             uuid PK
  userId         uuid FK -> User UNIQUE
  confirmedCount int DEFAULT 0
  lastQualifyingAt timestamptz NULL
  version        int DEFAULT 0        -- optimistic lock
  updatedAt

StreakEvent
  id           uuid PK
  streakId     uuid FK -> KillStreak CASCADE
  matchId      uuid FK -> Match UNIQUE
  state        enum(PENDING, CONFIRMED, REVERSED)
  graceExpiresAt timestamptz
  createdAt, updatedAt
  INDEX (state, graceExpiresAt)   -- for the scheduled finalize job

PowerUp                             -- post-MVP
  id           uuid PK
  key          varchar(40) UNIQUE
  name         varchar(80)
  effect       jsonb

InventoryItem                       -- post-MVP
  id          uuid PK
  userId      uuid FK -> User
  powerUpId   uuid FK -> PowerUp
  quantity    int DEFAULT 0
  UNIQUE (userId, powerUpId)

TakeoverBadge                       -- post-MVP, curated content only, no FK to Profile
  id           uuid PK
  label        varchar(60)
  flavorText   varchar(140)
  isApproved   boolean DEFAULT false
```

## 7. Payments _(post-MVP, schema fixed now)_

```
Purchase
  id              uuid PK
  userId          uuid FK -> User
  provider        enum(STRIPE)
  providerRef     varchar(120)
  idempotencyKey  varchar(120) UNIQUE
  amountCents     int
  currency        char(3)
  status          enum(PENDING, COMPLETED, FAILED, REFUNDED, DISPUTED)
  createdAt, updatedAt

ProcessedWebhookEvent
  id            uuid PK
  providerEventId varchar(120) UNIQUE
  processedAt   timestamptz

Entitlement
  id             uuid PK
  userId         uuid FK -> User
  type           enum(BERSERKER)
  sourcePurchaseId uuid FK -> Purchase NULL
  expiresAt      timestamptz NULL
  revokedAt      timestamptz NULL
  INDEX (userId, type)
```

## 8. Notifications & Analytics

```
Notification
  id         uuid PK
  userId     uuid FK -> User
  type       varchar(60)
  payload    jsonb
  readAt     timestamptz NULL
  createdAt
  INDEX (userId, readAt)

AnalyticsEvent
  id           uuid PK
  name         varchar(80)
  actorId      uuid NULL
  entityType   varchar(40) NULL
  entityId     uuid NULL
  metadata     jsonb
  privacyClass enum(NONE, PSEUDONYMOUS, PII)
  createdAt
  INDEX (name, createdAt)
```

## 9. Indexing rationale (key hot paths)

- Discovery candidate query: relies on `Profile.isComplete`, `DiscoveryDecision(deciderId, targetId)` unique index for the exclusion subquery, and `Block(blockedId)` for reverse exclusion — all covered above.
- Match-evaluation race: `DiscoveryDecision(targetId, decision)` index makes the reverse-decision lookup a single index scan; `Match` unique constraint on normalized pair prevents duplicate rows even under concurrent writers.
- Moderation queue: `ModerationCase(status, priorityScore DESC)` supports the moderator dashboard's default sort with no full scan.
- Streak finalize job: `StreakEvent(state, graceExpiresAt)` lets the scheduled job select only due rows.

## 10. Migrations discipline

Per global CLAUDE.md §15–19: every schema change ships as a Prisma migration (`prisma migrate dev`), reviewed statement-by-statement, tested on both a fresh and a populated shadow database, never `prisma db push` against a real environment. Destructive changes follow Expand → Backfill → Contract.
