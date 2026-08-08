# ADR-0006: Humble Match uses mutual reveal, not immediate reveal

## Status
Accepted

## Context
When a mutual rejection occurs, should both users be notified immediately, or only once both have separately "opened"/acknowledged the moment (mirroring how the joke — "you both thought you were too good for each other" — is funnier as a shared, simultaneous realization)?

## Decision
A `HumbleMatch` is created server-side the instant mutual rejection is detected (this is when analytics/state/streak logic fires), but the **celebratory reveal UI** is gated: each user must open their "Matches" surface to trigger their own client-side reveal animation. The match and messaging capability are available to both immediately (no artificial delay to actual functionality) — only the *animation/notification framing* is per-user-triggered, avoiding a scenario where User A gets a dramatic push notification while User B hasn't opened the app in days (which would read as bizarre/creepy rather than funny).

## Alternatives considered
1. Immediate push notification to both the instant it happens — rejected: can land as an unsettling surprise notification ("you and a stranger both rejected each other") with no context, especially if the user has forgotten who that profile was.
2. Fully manual, no notification at all, user must stumble on it — rejected: undermines the "shareable moment" growth mechanic; too passive.
3. Mutual reveal (in-app moment on next visit, standard notification badge, no special push copy spoiling the joke) — accepted.

## Consequences
- Notification service sends a neutral "You have a new match" push (same copy pattern as Normal Match) to avoid spoiling/confusing the moment out of context; the dramatic reveal is reserved for in-app.
- Analytics distinguishes `HumbleMatchCreated` (server event, immediate) from `HumbleMatchRevealed` (client event, per-user, on open) to correctly measure H2/H3 funnels from creation, not from reveal.
