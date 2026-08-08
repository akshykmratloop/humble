# Humble — API Contracts (MVP)

Style: REST, JSON, versioned path prefix `/v1`, RFC 7807 error bodies, cursor pagination (`?cursor=&limit=`, default 50 max 200 per global CLAUDE.md §11 default), every response echoes `x-request-id`. Full machine-readable OpenAPI spec (`openapi.yaml`) is generated from the Zod schemas during Phase 13 implementation — this document is the human-authored source of truth it must match.

Auth: session cookie (`humble_sid`, HttpOnly/Secure/SameSite=Lax) unless noted public. Rate limits are per-route defaults; tightened per abuse signal in production.

## Error shape
```json
{
  "type": "https://humble.app/errors/validation-error",
  "title": "Validation failed",
  "status": 422,
  "detail": "birthdate must indicate an age of 18 or older",
  "instance": "/v1/profiles/me",
  "requestId": "req_9f2..."
}
```

## Auth

| Method | Path | Auth | Rate limit | Notes |
|---|---|---|---|---|
| POST | `/v1/auth/register` | public | 5/hour/IP | body: email, password, birthdate. Returns 202, verification email sent. |
| POST | `/v1/auth/verify-email` | public | 10/hour/IP | body: token. |
| POST | `/v1/auth/login` | public | 10/15min/IP + 10/hour/account | body: email, password. Sets session cookie. |
| POST | `/v1/auth/logout` | session | — | Revokes current session. |
| POST | `/v1/auth/password-reset/request` | public | 5/hour/IP | Always 202 regardless of email existence (anti-enumeration). |
| POST | `/v1/auth/password-reset/confirm` | public | 10/hour/IP | body: token, newPassword. |
| GET | `/v1/auth/session` | session | — | Returns current user summary + role. |

## Profiles

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/v1/profiles/me` | session | Full self view including private fields. |
| PATCH | `/v1/profiles/me` | session | Partial update; validated per field (§PRD FR-02). |
| GET | `/v1/profiles/:id` | session | Public-view projection only; 404 if blocked/deleted/not discoverable to requester. |
| POST | `/v1/profiles/me/photos/upload-url` | session | Returns S3 signed PUT URL + photoId placeholder. |
| POST | `/v1/profiles/me/photos/:id/confirm` | session | Triggers server-side validation + async moderation scan. |
| PATCH | `/v1/profiles/me/photo-order` | session | body: ordered photoId array. |
| DELETE | `/v1/profiles/me/photos/:id` | session | |
| GET | `/v1/preferences/me` | session | |
| PATCH | `/v1/preferences/me` | session | Includes `humbleMatchOptOut`. |

## Discovery

| Method | Path | Auth | Rate limit | Notes |
|---|---|---|---|---|
| GET | `/v1/discovery/candidates?cursor=&limit=` | session | 60/min/account | Server-computed, safety-filtered (see LLD §3). |
| POST | `/v1/discovery/decisions` | session | 120/min/account | body: `{ targetId, decision: "LIKE"\|"REJECT" }`. Returns `{ decision, match: null \| { id, type } }`. Idempotent. |

## Matching / Matches

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/v1/matches?cursor=&limit=` | session | List of the caller's matches, both types, with last-message preview. |
| GET | `/v1/matches/:id` | session | Object-level check: caller must be a participant. |
| POST | `/v1/matches/:id/unmatch` | session | Sets status UNMATCHED; irreversible by design. |

## Messaging

| Method | Path | Auth | Rate limit | Notes |
|---|---|---|---|---|
| GET | `/v1/conversations/:matchId/messages?cursor=&limit=` | session | — | Object-level participant check. |
| POST | `/v1/conversations/:matchId/messages` | session | 30/min/conversation, 200/day/account | Body: `{ body }`. Executes the ordered check pipeline in LLD §5. |
| WS | `/ws` (Socket.IO namespace `/chat`) | session (cookie during handshake) | connection-level throttle | Events: `message:new`, `message:read`, `conversation:typing`. |

## Safety

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/blocks` | session | body: `{ userId }`. Always succeeds if target exists (INV-1). |
| DELETE | `/v1/blocks/:userId` | session | Unblock — only the blocker can reverse it. |
| POST | `/v1/reports` | session | body: `{ userId, category, details? }`. Always creates a `ModerationCase` (INV-2). |

## Admin / Moderation (role: MODERATOR or ADMIN)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/v1/admin/moderation-cases?status=&cursor=` | moderator+ | Sorted by priority. |
| GET | `/v1/admin/moderation-cases/:id` | moderator+ | Includes evidence, history. |
| POST | `/v1/admin/moderation-cases/:id/actions` | moderator+ | body: `{ action, reason }`. Writes `AuditEvent` in same transaction. |
| GET | `/v1/admin/users/:id` | moderator+ | Investigation view (profile + report history + risk score). |
| POST | `/v1/admin/users/:id/suspend` | admin | body: `{ durationDays, reason }`. |
| GET | `/v1/admin/audit-events?targetId=&cursor=` | admin | |

## Notifications

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/v1/notifications?cursor=` | session | |
| POST | `/v1/notifications/:id/read` | session | |
| GET/PATCH | `/v1/notification-preferences/me` | session | |

## Account

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/v1/account/deactivate` | session | Immediate discovery-hide, reversible via login. |
| POST | `/v1/account/delete` | session | Starts grace-period deletion (FR-20). |

## Health (public, no auth)

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness — process is up. |
| GET | `/ready` | Readiness — DB + Redis reachable. |

## Post-MVP endpoint stubs (documented now, implemented in Phase 2/3, not built yet)

`POST /v1/game/super-reject`, `GET/POST /v1/game/inventory`, `POST /v1/game/inventory/:id/consume`, `POST /v1/payments/checkout-sessions`, `POST /v1/payments/webhooks/stripe` (public but signature-verified), `POST /v1/game/berserker/activate`, `GET/POST /v1/game/takeover-challenges`.
