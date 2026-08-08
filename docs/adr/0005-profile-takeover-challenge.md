# ADR-0005: "Enemy takeover" replaced with sandboxed Profile Takeover Challenge

## Status

Accepted

## Context

Original concept: control a match's profile for 24 hours and modify it. This is unauthorized modification of another real person's identity data — impersonation, harassment, and moderation risk, regardless of intent.

## Decision

Implement **Profile Takeover Challenge**: within an active Match, either party may apply a **cosmetic challenge card** that renders as an overlay _only inside that match's chat/match view_, visible only to the two matched users, never on the public/discoverable profile, and never persisted to the `Profile` entity. The overlay is composed exclusively from a **pre-approved, moderation-reviewed content library** (badges, titles, "roast" one-liners) — no free text input, ever. It auto-expires after 24 hours and is fully reversible (no residual state). The affected user can dismiss it at any time; dismissal is instant and unconditional (same "safety wins" principle as block/report).

## Alternatives considered

1. Implement literally (edit their real profile) — rejected: impersonation/harassment/legal liability, would require the "victim's" explicit ongoing consent per-edit to not be abusive, defeating the joke's spontaneity.
2. Allow free-text badges — rejected: unmoderated free text on a "roast" surface is a harassment vector (slurs, threats) waiting to happen; curated library only.
3. No takeover mechanic at all — rejected as unnecessarily conservative; a sandboxed, curated, reversible, dismissible version preserves the comedic intent with essentially zero real risk.

## Consequences

- Requires a small curated content table (`TakeoverBadge`) moderated before launch and expandable later; must ship with a "report this badge" affordance in case a curated item is later found to be in poor taste.
- Zero write access to the real `Profile`/`ProfilePhoto` tables from this feature — enforced by giving the Game module no repository access to Profile at all (module boundary, not just convention).
- Deferred to post-MVP (Phase 3) since it depends on Match + Game infrastructure being stable first.
