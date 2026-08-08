# ADR-0003: Kill Streak — explicit, farm-resistant state machine

## Status
Accepted

## Context
Original concept ("3 consecutive qualifying matches unlocks Kill Streak") left "consecutive" undefined, creating multiple exploitable ambiguities: does a Humble Match count same as Normal Match? What happens on unmatch/block/report? Can multiple accounts farm it?

## Decision
A **Kill Streak** is a per-user counter of consecutive **qualifying match events**, defined precisely:

**Qualifying event**: A `Match` (Normal or Humble — both count equally, deliberately, to avoid incentivizing one over the other) that:
- involves two distinct, non-bot-flagged, non-same-risk-cluster accounts (fraud/risk service check), AND
- is not unmatched, blocked, or reported by either party within a **grace window of 24 hours** from creation, AND
- is rate-limited: at most **one streak-qualifying increment per rolling 5-minute window** per user, regardless of how many matches actually occur (prevents rapid-swipe farming from inflating streak velocity).

**Streak increment timing**: A match provisionally increments the streak counter immediately (for responsive UX/animation), but is marked `PENDING` for 24h. If within the grace window either party unmatches, blocks, or reports the other, the increment is **reversed** (streak decremented, and if that broke the sequence, the whole streak resets to the last fully-confirmed count). If a user holds a Shield "streak insurance" token, one reversal per streak can be absorbed (the increment stays, token is consumed) — see ADR-0002.

**Streak break conditions**: A gap of more than **7 days** with zero qualifying events resets the streak to 0. A confirmed report *against* the user (i.e., they were the one reported, and moderation upholds it) immediately resets their streak to 0 as a trust penalty, independent of the grace-window logic.

**Anti-farming controls**: Both accounts in a candidate match must pass the existing fraud/risk-scoring service (device fingerprint clustering, account-age minimums, velocity anomaly detection) before the match counts toward either party's streak. This reuses the platform's general abuse-detection service (see `09-threat-model.md`) rather than inventing streak-specific fraud logic.

**Reward at threshold**: Reaching 3 grants a Power-Up (see `04-domain-model.md`); the streak continues to count past 3 with escalating rewards at further milestones (configurable, e.g., 5, 10), not capped at 3.

## Alternatives considered
1. Count only Normal Matches — rejected: undermines the product's core identity by treating Humble Match as second-class.
2. No grace window (instant permanent credit) — rejected: trivially farmable by matching then immediately unmatching in bulk.
3. Per-match-type separate streaks — considered for Phase 2 analytics (track both) but a single unified streak is simpler for MVP UX and matches the "any match is a win" framing.

## Consequences
- Requires a background job (or on-access lazy evaluation) to expire `PENDING` increments after 24h and finalize them.
- Requires the streak service to depend on the fraud/risk service — an explicit module dependency documented in the LLD.
- Slightly delayed "final" streak confirmation (24h) is acceptable because the *provisional* UI reward (animation, counter) is instant; only the durable reward grant waits for confirmation.
