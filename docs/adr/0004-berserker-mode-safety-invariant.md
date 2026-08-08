# ADR-0004: Berserker Mode may never weaken block/report

## Status
Accepted

## Context
Original concept included Berserker Mode granting paying users alleged immunity from block/report. This is a hard line: no monetized feature may disable another user's safety controls. This isn't just a policy choice — it's a likely legal/regulatory liability and a platform-policy violation (Apple/Google both prohibit features that prevent users from blocking/reporting abusive behavior).

## Decision
Berserker Mode is redesigned as a **time-boxed visibility and initiation-permission boost**:
- Enhanced discovery placement for the active window.
- Permission to initiate a conversation in contexts where the active `ConversationPolicy` would otherwise restrict initiation to the other party (e.g., under a "women message first" policy, an active Berserker purchase grants the buyer permission to send the first message) — but only within the same messaging rate limits and abuse detection as anyone else.
- Cosmetic profile treatment (badge/border) during the active window.
- A wider (but still bounded and abuse-monitored) messaging-initiation allowance.

**Hard invariant (enforced in code, not configuration):** `BlockService.block()` and `ReportService.report()` succeed unconditionally against any user regardless of Berserker (or any other paid) state, with no added latency, no special-case bypass path, and no notification to the blocked/reported user identifying who acted. This is asserted by a dedicated integration test suite (`invariants.spec`) that runs against every module touching messaging.

## Alternatives considered
1. Implement as specified with immunity — rejected outright, no viable safe version exists for "immunity from block/report."
2. Berserker grants nothing but a badge (fully cosmetic) — rejected as under-delivering on the monetization hypothesis; the initiation-permission boost is a legitimate, safe value proposition already proven by "Super Like"-style features on incumbent apps.

## Consequences
- Messaging module must check `ConversationPolicy` + Berserker entitlement + safety state (block list) in that priority order: **block check always runs first and short-circuits everything else.**
- QA/test suite must include an explicit adversarial test: purchase Berserker → get blocked → assert message send fails with 403, not 200.
- Marketing copy must never claim immunity from moderation; must be reviewed against this ADR before publishing.
