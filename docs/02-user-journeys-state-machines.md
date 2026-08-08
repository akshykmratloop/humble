# Humble — User Journeys & State Machines

## 1. User journeys

### 1.1 New user

```
Landing → Sign up (email/password or Google) → Verify email
  → Onboarding: birthdate (18+ gate) → gender/orientation → preferences (age range, distance)
  → Profile creation: name, bio, ≥1 photo (up to 6)
  → Profile marked COMPLETE
  → Enter Discovery
```

Drop-off risks: photo upload friction, verification email delay. Mitigation: allow discovery preview (blurred/locked) before verification to reduce early drop-off, but no decisions can be submitted until verified (server-enforced).

### 1.2 Discovery

```
Fetch candidate batch → Render card → User swipes/taps Like or Reject
  → Server records decision → checks counterpart's prior decision
     → no match: advance to next card
     → Normal Match: celebration → matches list updated
     → Humble Match: dramatized reveal (on next open, per ADR-0006) → matches list updated
  → Batch exhausted → fetch next batch (or empty state)
```

### 1.3 Normal Match → conversation

```
MutualLikeDetected → Match(NORMAL) created → both notified (standard push copy)
  → either party opens conversation (subject to ConversationPolicy initiation rule)
  → first message sent → ConversationStarted
  → ongoing messaging (realtime via WebSocket)
```

### 1.4 Humble Match → conversation

```
MutualRejectDetected → Match(HUMBLE) created (server-side, immediate)
  → both notified with NEUTRAL copy (no spoiler)
  → User opens Matches tab → client-side dramatized reveal plays (HumbleMatchRevealed)
  → conversation available with special first-message prompt ("ask why they rejected you")
  → ongoing messaging
```

### 1.5 Super Reject _(post-MVP)_

```
User selects Super Reject on a candidate → charge balance check
  → insufficient charge: blocked, upsell/earn-path shown
  → sufficient charge: charge consumed → Reject recorded (permanent mutual exclusion)
     → sender sees dramatized "finishing move" VFX
     → recipient experience is identical to a normal reject (no signal sent)
```

### 1.6 Shield _(post-MVP)_

```
Acquire (purchase or free-earn milestone) → added to Inventory
  → at decision time, user may consume 1 Shield → Reject decision flagged shielded
     → contributes 1 "streak insurance" token OR suppresses dignity-signal (already default-suppressed)
  → Inventory balance decremented server-side, never client-side
```

### 1.7 Kill Streak

```
Qualifying Match created → streak counter +1 (PENDING, provisional UI reward)
  → 24h grace window elapses with no unmatch/block/report from either party → increment CONFIRMED
  → OR grace window broken → increment REVERSED (unless Shield insurance consumed)
  → threshold reached (3, 5, 10, ...) → reward granted (badge / power-up) → KillStreakCompleted
  → 7 days with no qualifying event → streak reset to 0
  → confirmed report against the user → streak reset to 0 immediately (trust penalty)
```

### 1.8 Berserker Mode _(post-MVP)_

```
User purchases/activates Berserker → Stripe checkout → webhook verified → Entitlement(BERSERKER, expiresAt) granted
  → during active window: enhanced discovery placement + initiation-permission override
  → messaging still subject to block/report/rate-limit checks unconditionally
  → expiry → entitlement lapses → normal ConversationPolicy resumes
```

### 1.9 Safety: Block

```
User taps Block on a profile/conversation → confirmation prompt
  → BlockService.block() executes unconditionally and immediately
  → counterpart removed from discovery both directions
  → active conversation (if any) locked to new messages from either side
  → UserBlocked event recorded
```

### 1.10 Safety: Report

```
User taps Report → selects category → optional evidence/details → submit
  → ModerationCase(OPEN) created unconditionally, regardless of any other state
  → risk-scored and queued for moderator review
  → moderator acts → case resolved → reporter notified of outcome category (not moderator identity/details)
  → reported user may appeal → new linked case → secondary review
```

### 1.11 Account deletion

```
User requests deletion → immediate: hidden from discovery, sessions revoked
  → grace period (e.g., 14 days) during which login reactivates the account
  → grace period expires → hard deletion/anonymization job runs
     → PII purged; moderation-relevant records retained in anonymized form per policy
```

## 2. State machines

Notation: `[State] --event--> [State]`.

### 2.1 User

```
[Registered] --EmailVerified--> [Active]
[Active] --ProfileCompleted--> [Active] (profile.complete=true, discovery-eligible)
[Active] --DeactivationRequested--> [Deactivated] --Login--> [Active]
[Active] --DeletionRequested--> [PendingDeletion] --GracePeriodExpired--> [Deleted]
[PendingDeletion] --Login--> [Active]
[Active] --ModerationBan--> [Suspended] --AppealApproved--> [Active]
[Suspended] --AppealDenied--> [Suspended] (terminal pending further appeal policy)
```

### 2.2 Profile

```
[Incomplete] --MinimumFieldsAndPhotoProvided--> [Complete]
[Complete] --RequiredFieldRemoved--> [Incomplete]
[Complete] --UserDeactivated/Deleted--> [Hidden]
```

### 2.3 DiscoveryDecision (Like/Reject)

```
[None] --Like--> [Liked]
[None] --Reject--> [Rejected]
(terminal per decider→target pair; idempotent re-submission is a no-op)
```

### 2.4 Match

```
[None] --MutualLikeDetected--> [NORMAL:Active]
[None] --MutualRejectDetected (both allow Humble)--> [HUMBLE:Active]
[NORMAL:Active] --NoMessageWithinWindow--> [Expired]
[HUMBLE:Active] --NoMessageWithinWindow--> [Expired]
[*:Active] --Unmatch(eitherParty)--> [Unmatched]
[*:Active] --Block(eitherParty)--> [Closed] (conversation locked, match record retained for history/moderation)
[Expired] --ReactivationRequested(bothParties, explicit)--> [*:Active]
```

### 2.5 Conversation

```
[Unavailable] --MatchActive & PolicyAllowsInitiation--> [Available]
[Available] --FirstMessageSent--> [Started]
[Started] --OngoingMessaging--> [Started]
[Started|Available] --MatchClosedOrExpired--> [Locked]
```

### 2.6 Message

```
[Composed] --Validated--> [Sent] --Delivered(recipient online)--> [Delivered] --Read--> [Read]
[Sent] --RecipientOffline--> [PendingDelivery] --RecipientOnlineOrPoll--> [Delivered]
[Sent|Delivered] --Reported--> [Flagged] (message remains visible to parties; visible to moderation)
```

### 2.7 Super Reject charge _(post-MVP)_

```
[Available] --Consumed--> [OnCooldown] --RegenTimerElapsed--> [Available]
[OnCooldown] --EarnedGrant--> [Available] (immediate grant bypasses remaining cooldown, capped at max charges)
```

### 2.8 Shield / InventoryItem _(post-MVP)_

```
[None] --PurchaseGrantedOrEarned--> [Available:qty>0]
[Available] --Consumed--> [Available:qty-1] (or [None] if qty reaches 0)
```

### 2.9 Kill Streak

```
[count=0] --QualifyingMatchCreated--> [count=N:PENDING]
[count=N:PENDING] --GraceWindowElapsedClean--> [count=N:CONFIRMED]
[count=N:PENDING] --UnmatchOrBlockOrReportWithinWindow (no Shield)--> [count=N-1:CONFIRMED]
[count=N:PENDING] --UnmatchOrBlockOrReportWithinWindow (Shield consumed)--> [count=N:CONFIRMED]
[count=N:CONFIRMED] --ThresholdReached--> [count=N:CONFIRMED] + RewardGranted
[count=N:CONFIRMED] --7DaysInactive--> [count=0]
[count=N:CONFIRMED] --ConfirmedReportAgainstUser--> [count=0]
```

### 2.10 Power-Up / Entitlement _(post-MVP)_

```
[Granted] --Activated(if time-boxed)--> [Active] --Expired--> [Consumed]
[Granted] --Consumed(if one-shot)--> [Consumed]
```

### 2.11 Berserker Mode _(post-MVP)_

```
[Inactive] --PurchaseVerified--> [Active:expiresAt]
[Active] --ExpiryReached--> [Inactive]
[Active] --RefundedOrChargedBack--> [Inactive] (immediate revocation, does not retroactively invalidate messages sent while active)
```

### 2.12 Subscription _(future, if introduced)_

```
[None] --Subscribed--> [Active] --RenewalFailed--> [PastDue] --RenewalSucceeded--> [Active]
[PastDue] --GracePeriodExpired--> [Cancelled]
[Active] --UserCancelled--> [ActiveUntilPeriodEnd] --PeriodEnds--> [Cancelled]
```

### 2.13 Payment

```
[Initiated] --StripeCheckoutCompleted--> [PendingWebhookConfirmation]
[PendingWebhookConfirmation] --WebhookVerified(success)--> [Completed] --EntitlementGranted--> [Completed]
[PendingWebhookConfirmation] --WebhookVerified(failed)--> [Failed]
[Completed] --RefundWebhook--> [Refunded] --EntitlementReconciled--> [Refunded]
[Completed] --ChargebackWebhook--> [Disputed] --EntitlementRevoked--> [Disputed]
```

### 2.14 Report / ModerationCase

```
[Open] --ModeratorAssigned--> [InReview]
[InReview] --ActionTaken(warn/hide/suspend/ban)--> [Resolved:Actioned]
[InReview] --Dismissed(insufficientEvidence)--> [Resolved:Dismissed]
[Resolved:*] --AppealFiled--> [Appealed] --SecondaryReview--> [Resolved:Final]
```

### 2.15 Account Suspension

```
[Active] --ModerationActionSuspend--> [Suspended:duration]
[Suspended] --DurationElapsed--> [Active]
[Suspended] --AppealApproved--> [Active] (early reinstatement)
[Suspended] --RepeatOffense--> [Banned] (terminal, appeal path still exists per policy)
```

### 2.16 Account Deletion

```
[Active] --DeletionRequested--> [PendingDeletion:gracePeriod]
[PendingDeletion] --Login--> [Active]
[PendingDeletion] --GracePeriodExpires--> [Deleted] (terminal, anonymization job runs)
```

## 3. Cross-cutting rule

Every transition above that touches Block or Report is defined to **short-circuit all other state** (payment, streak, Berserker, etc.) — this is enforced in code as INV-1/INV-2 in `09-threat-model.md`, not just documented here.
