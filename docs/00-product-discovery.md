# Humble — Product Discovery

Status: **Draft v1 — approved-by-default per autonomous execution mandate; flagged items need product-owner sign-off (see §18).**

## 1. Restating the product

Humble is a dating app whose core twist is a second kind of match: if two people **independently reject each other**, the app treats that mutual rejection as a match too ("Humble Match"), on the joke that "you both thought you were too good for each other, so now you have to meet." On top of that dating core, Humble layers a light competitive/game system (streaks, power-ups, boosted visibility) that turns the ordinary swipe loop into something with a bit of ego, humor, and stakes.

It is a **real dating product** wrapped in **social-game presentation**. The mechanics (not just the skin) are the differentiator — a Humble Match must feel structurally and emotionally different from a normal match, not just relabeled.

## 2. Core product loop

```
See a profile
   → Decide (Like / Reject / Super Reject)
      → Server evaluates the other party's prior decision
         → Normal Match (mutual like)  OR  Humble Match (mutual reject)  OR  no match (decisions don't overlap)
            → Conversation opportunity created
               → Messaging → (optional) meet
   → Streaks / power-ups accumulate from qualifying outcomes
      → Re-engagement loop: come back to check matches, streak status, inventory
```

The loop only works if:
1. Decisions are cheap and fast (swipe-speed), so volume is high enough for both match types to occur regularly.
2. The Humble Match reveal is a *bigger* emotional beat than a normal match, not a footnote.
3. Game systems reward showing up and playing fairly — never reward harming another user.

## 3. Decomposition

### 3.1 Core dating mechanics
- Auth, profile, photos, preferences
- Discovery feed / card stack
- Like, Reject (Pass), Super Reject
- Normal Match (mutual like)
- Humble Match (mutual reject)
- Messaging / conversation policy (who can initiate, when)
- Unmatch

### 3.2 Game mechanics
- Kill Streak (consecutive qualifying match outcomes)
- Power-ups (Shield, Boost, Streak Multiplier, Spotlight, Match Reveal, etc.)
- Berserker Mode (paid visibility/initiation boost)
- Profile Takeover Challenge (safe redesign of "enemy takeover")
- Shareable achievement cards

### 3.3 Monetization
- Shields (consumable, purchasable, also earnable free)
- Berserker Mode (time-boxed subscription/boost purchase)
- Cosmetic power-ups / spotlight boosts
- (Future) Premium tier bundling several boosts

### 3.4 Safety
- Blocking (absolute, unconditional)
- Reporting (absolute, unconditional, cannot be muted by any paid feature)
- Rate limiting / abuse detection / risk scoring
- Super Reject abuse controls (cooldowns, no visibility-destruction)
- Content moderation for photos/bios/messages

### 3.5 Moderation
- Report intake → triage → moderator action → audit → appeal
- Admin console for user/profile/report/payment/fraud investigation
- Automated signals (image/text classifiers) feeding human review queue

### 3.6 Infrastructure
- Modular monolith (NestJS, JavaScript) + Next.js (JavaScript) web client
- PostgreSQL (source of truth), Redis (ephemeral state), S3 (media), Socket.IO (realtime chat)
- Stripe for payments, webhook-verified entitlements

### 3.7 Analytics
- Funnel: signup → profile complete → first swipe → first match (either type) → first message → first reply
- Mechanic-specific: Humble Match rate, streak distribution, power-up usage, Berserker conversion
- Trust & safety: block rate, report rate, moderation SLA, repeat-offender rate

## 4. Original mechanics that are unsafe as specified, and their redesign

| # | Original mechanic | Why it's unsafe / non-viable | Safe redesign (preserves comedy/gameplay) | Status |
|---|---|---|---|---|
| 1 | **Super Reject** "temporarily kicks the other user off the app" | Account-level denial-of-service against a real person; weaponizable at scale; a user could be knocked offline by strangers for no cause. Also likely violates app-store policies on user-initiated account suspension. | Super Reject applies a **temporary discovery de-prioritization** to the *sender's own future matching pool overlap* with that person (they simply stop seeing each other) plus a **personal cooldown timer on the sender's Super Reject charge** (scarce resource). It never suspends, logs out, or blocks the recipient's access to the app. The recipient is not notified who did it or that anything punitive happened to them — from their side, nothing changes except that person disappears from mutual discovery, identical to what already happens after any reject. | **Redesigned — see ADR-0002** |
| 2 | **Shields** "block Super Reject effects", sold 3-for-$9.99 | Since Super Reject no longer harms the recipient, Shields no longer need to "block an attack." Selling protection from a removed threat is deceptive monetization. | Shields become a **positive consumable**: consuming a Shield converts your *next* Reject/Super Reject decision into a guaranteed private/no-residue action (no game-visible "you got rejected" card shown to the other party — see product principle on rejection dignity) **and/or** grants one Kill-Streak "insurance" (protects streak from breaking on an unmatch). Reframed from "defense against attack" to "a strategic play." Free earn path exists (see §7 monetization ethics). | **Redesigned — see ADR-0002** |
| 3 | **Kill Streak** definition ambiguous; farmable | Undefined consecutive-match rules invite bot/multi-account farming and give no clear reward boundary. | Explicit state machine (see `02-user-journeys-state-machines.md` §Kill Streak). Only **server-confirmed, distinct-counterparty** Normal or Humble Matches count; a match that is unmatched/reported/blocked **before any message is sent by either party** is voided retroactively from the streak; velocity-limited (max 1 streak-qualifying event counted per rolling 5 minutes) to blunt farming; same-device/same-cluster accounts excluded via existing fraud/risk scoring. | **Redesigned — see ADR-0003** |
| 4 | **Berserker Mode** "immune from block/report" | Directly violates platform safety guarantees; makes paying users unaccountable; almost certainly illegal/policy-violating (harassment enablement). | Berserker Mode = visibility + initiation-permission boost only. **Block and Report always function against a Berserker user, with no exception, no delay, and no notification to the Berserker user about who did it.** This is a hard architectural invariant (see `09-threat-model.md` INV-1/INV-2), not a configurable flag. | **Redesigned — see ADR-0004** |
| 5 | **"Enemy takeover"**: control a match's profile for 24h and edit it | Unauthorized modification of another real person's dating profile is impersonation, harassment, and a moderation/legal liability (a stranger could add offensive content to someone's public profile). | **Profile Takeover Challenge**: a sandboxed, mutually-visible **cosmetic challenge card** layered *on top of* the match view only (never the real profile, never visible to anyone but the two matched users, never edits the underlying `Profile` record). Bounded to a curated list of pre-approved humorous badges/titles/roast lines. Fully reversible, expires automatically, cannot include free text. | **Redesigned — see ADR-0005** |
| 6 | Paid feature "message first" / bypassing normal initiation order | Not unsafe per se, but must not bypass the configurable ConversationPolicy's safety timers (e.g., match-expiry windows) in a way that pressures a user who hasn't engaged. | Kept, but modeled as a policy exception with the same expiry/reporting rules as any conversation. | **Kept, constrained — see ADR-0004** |

## 5. Product principles

1. **The joke is on the mechanic, never on a person.** Copy roasts the *concept* of mutual rejection, never a specific user's appearance/identity/protected class.
2. **Rejection has dignity.** A user who gets rejected (normal, non-mutual) never sees a "you got rejected" notification. Silence is the default UX for one-sided rejection, exactly like most dating apps — Humble only escalates drama for the *mutual* case, which is a shared, symmetric, consensual-feeling joke.
3. **Safety systems always win.** No monetized feature, streak, or power-up can weaken block, report, or moderation. This is non-negotiable and enforced at the architecture level, not just policy.
4. **Nothing edits another user's real data without their explicit action.** Game mechanics are additive/cosmetic and scoped to the interaction surface, never the identity record.
5. **Chaos is a presentation layer, not a permissions bypass.** Humor lives in copy, animation, and framing — never in relaxed authorization checks.
6. **Pay-to-win has a ceiling.** Monetized boosts affect visibility/initiation convenience, never match legitimacy (you cannot buy a match, buy immunity, or buy the ability to harm someone).
7. **Every mechanic must survive a "screenshot and show it to a journalist" test.**

## 6. Non-goals (MVP)

- Native iOS/Android apps (web-responsive first; architecture allows mobile later)
- Video chat / voice notes
- Multi-language / i18n (English only for MVP)
- Algorithmic ML-based match recommendation (rule-based discovery ranking for MVP)
- Fully automated content moderation (human-in-the-loop required for MVP; automation assists, doesn't decide)
- International payments / multi-currency (single currency, Stripe, one region for MVP)
- Real profile "takeover" of any kind (permanently out of scope, not just MVP — see ADR-0005)
- Super Reject or any mechanic that removes another user's access to the app (permanently out of scope — see ADR-0002)

## 7. Assumptions

- Target launch market: English-speaking, single country/timezone region for MVP (assume US).
- Users skew 18–34, comfortable with gaming/internet-native humor.
- Legal minimum age 18+, enforced at signup (self-attestation + standard age-gate; ID verification deferred post-MVP unless required by regulation).
- Web-first is acceptable for MVP validation; native apps are a post-MVP investment decision gated on traction.
- Stripe is available in the launch region.
- The team operating this is small (assume 1–3 engineers effectively, i.e., "the CTO+Claude" build model) — this justifies modular monolith over microservices (see ADR-0001).

## 8. Risks

### Product risks
- P1: Users may perceive "Humble Match" as mockery rather than humor, causing brand damage. Mitigate via careful copy tone-testing and an opt-out (see FR in PRD).
- P2: Core hypothesis (H1) may be false — mutual rejection may just feel bad, not funny. MVP must measure this directly (conversation-start rate, opt-out rate, sentiment in early survey/interview).
- P3: Monetized mechanics (Shields, Berserker) could be perceived as pay-to-win even in the safe redesign, damaging trust before the dating core has proven value.
- P4: Novelty mechanics may drive one-time viral downloads without retention if the underlying dating core (profile quality, match quality) is weak.

### Technical risks
- T1: Realtime chat (Socket.IO) at scale needs sticky sessions / a shared adapter (Redis) — must design for horizontal scale from the start even in a monolith.
- T2: Streak/power-up state must be strictly server-authoritative; a naive implementation is easy to get wrong (see INV-5/INV-6 in threat model).
- T3: Payment entitlement reconciliation (webhook idempotency, duplicate delivery, refunds) is a common source of production incidents if not modeled as a real state machine from day one.
- T4: Discovery/matching query performance (candidate selection excluding blocked, already-decided, opposite preference, etc.) can degrade badly without correct indexing — must design database indexes deliberately (see `07-database-design.md`).

## 9. Open questions (require product-owner input where flagged)

1. **[Needs approval]** Exact target launch geography and age-verification rigor.
2. **[Needs approval]** Gender model for discovery/preferences — binary, inclusive multi-select, or fully configurable? Default assumption below.
3. **[Needs approval]** Pricing for Shields/Berserker Mode — placeholder prices used in PRD, must be validated commercially.
4. **[Decided, documented]** Whether Super Reject/Shields/Berserker/Takeover are redesigned — yes, per §4 above.
5. Whether a Humble Match should be visually distinguishable to *both* users only after both have opened it (mutual reveal), or immediately — **default decision: mutual reveal, matching the "you both thought..." joke structure**, documented as ADR-0006.

## 10. Competitive analysis (brief)

- **Tinder/Bumble/Hinge**: swipe-based, single match type (mutual like), extensive monetization (boosts, super likes, read receipts). Humble differentiates on the *second match type* and game-layer identity, not on swipe mechanics themselves — no need to reinvent discovery UX patterns users already understand.
- **Bumble**: women-message-first is a proven safety-oriented pattern — Humble adopts a configurable version (see PRD ConversationPolicy) rather than inventing a new one.
- **Gamified apps (S'more, Feels, BLOOM)**: prove appetite for personality-first, less photo-obsessed formats but haven't combined it with a genuinely novel match mechanic — Humble's white space is the mutual-rejection twist itself.

## 11. Monetization hypotheses

- H8a: Shields (positive-consumable redesign) sell better as "strategic currency" than as "protection from an attack," because the framing is upbeat, not fear-based.
- H8b: Berserker Mode (visibility+initiation boost) is a viable subscription-style upsell if conversion-to-conversation improves for buyers by a measurable margin over organic.
- H8c: A cosmetic-only track (profile takeover challenge skins, badges) can monetize without any pay-to-win perception risk.

## 12. Safety principles (see also `09-threat-model.md`)

1. Block and Report are always available, always effective, and never delayed or weakened by any paid feature, game state, or streak.
2. No mechanic can modify another user's real profile data.
3. No mechanic can remove another user's access to the platform.
4. No mechanic can be used to single out a person outside of the two-party interaction that triggered it (no mass-targeting).
5. All monetized entitlements are server-verified against the payment provider; the client is never trusted to self-grant.
6. All abuse-relevant actions (Super Reject, Berserker activation, reports) are rate-limited and risk-scored.

## 13. MVP proposal

See PRD §"MVP Scope" for the authoritative list. Summary: Auth, Profile, Discovery, Like/Reject, Normal Match, Humble Match, Messaging (with configurable initiation policy), Block, Report, basic Moderation console, basic Analytics, basic Notifications. Kill Streak is included in MVP (cheap to build, core to identity) with a conservative anti-farming design. Shields/Berserker/Power-ups/Profile-Takeover are **post-MVP** (Phase 2) — they depend on payments infrastructure and are not required to test the core hypothesis (H1: is mutual rejection interesting?).

## 14. Post-MVP roadmap (indicative)

- Phase 2: Payments infra, Shields, Kill Streak rewards, Power-up inventory
- Phase 3: Berserker Mode, Profile Takeover Challenge, shareable achievement cards
- Phase 4: Native mobile apps, push notifications, ID verification, international expansion

## 15. North Star Metric

Candidate: **Meaningful Mutual Interaction Rate (MMIR)** — % of all matches (Normal + Humble) that reach a **2-way message exchange (≥1 message from each side) within 48 hours**, tracked **separately by match type** so we can directly test H2/H3.

Alternative considered: raw match count (rejected — rewards volume over quality, easy to inflate with the Humble mechanic itself, which would be measuring our own gimmick rather than product health). Retention (D7) considered as a lagging companion metric, not primary, because it moves too slowly to guide early iteration.

**Decision: adopt MMIR as North Star, split by match type, with D7 retention as the primary lagging companion metric.**

## 16. Hypotheses → metrics

| Hypothesis | Metric | MVP instrumentation |
|---|---|---|
| H1: Mutual rejection is interesting | Humble Match opt-in rate (users who don't disable the feature) + qualitative survey | Analytics event + in-app micro-survey after first Humble Match |
| H2: Higher conversation-start rate | MMIR split by match type | `MatchCreated`/`HumbleMatchCreated` → `ConversationStarted` funnel |
| H3: Higher first-date intent | Self-reported "planned to meet" flag after N days (post-MVP survey) | Deferred instrumentation, MVP: proxy via message-count depth |
| H4: Gamification improves retention | D7/D30 retention, streak-participation cohort vs. control | Cohort analysis once streak ships |
| H5: Users understand Normal vs Humble | Support-ticket/confusion rate, in-app comprehension micro-survey | Manual review in first 2 weeks |
| H6: Perceived as playful not hostile | Report rate on Humble Matches vs Normal Matches | `UserReported` tagged by match type |
| H7: Power-ups increase engagement without trust damage | Post-MVP: engagement lift vs. NPS/trust survey delta | Deferred to Phase 2 |
| H8: Paid mechanics revenue without unacceptable pay-to-win | Post-MVP: revenue vs. churn/report-rate among payers | Deferred to Phase 2/3 |

## 17. Decision log pointer

Formal decisions are tracked in `docs/adr/`. Key ADRs from this discovery phase: ADR-0001 (modular monolith), ADR-0002 (Super Reject/Shields redesign), ADR-0003 (Kill Streak state machine), ADR-0004 (Berserker Mode + block/report invariant), ADR-0005 (Profile Takeover Challenge), ADR-0006 (mutual reveal for Humble Match).

## 18. Decisions requiring explicit product-owner approval before Phase-2 monetization work begins

- [ ] Final Shields/Berserker pricing
- [ ] Launch geography and identity-verification rigor
- [ ] Gender/orientation model for matching preferences
- [ ] Whether Kill Streak rewards should ever include monetary value (default assumption: cosmetic/power-up only, never cash-equivalent, to avoid gambling-regulation exposure)

Everything else in this document is treated as decided-by-default per the autonomous execution mandate and may be revisited via a new ADR if evidence emerges.
