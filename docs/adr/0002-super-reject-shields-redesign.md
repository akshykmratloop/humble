# ADR-0002: Redesign Super Reject and Shields to remove account-level harm

## Status
Accepted

## Context
Original concept: "Super Reject temporarily kicks the other user off the app"; "Shields (buy 3 for $9.99) block Super Reject effects." This is an account-level denial-of-service mechanic weaponizable by any user against any other user, with real harm (loss of app access), no due process, and likely platform-policy/legal exposure. Selling "protection" from an attack we control and could simply not implement is also a manipulative monetization pattern.

## Alternatives considered
1. **Implement literally as specified** — rejected: real DoS against a person; unacceptable safety risk; almost certainly violates app store policy (arbitrary user-triggered account suspension) and could constitute a harassment vector.
2. **Super Reject = temporary global visibility penalty (reduced discovery placement platform-wide)** — rejected: still harms the *recipient's* experience unrelated to the actor, effectively a stranger-triggered platform-wide penalty; same DoS shape at smaller scale, still not acceptable as a "punish someone else" mechanic in the recipient's own discovery, and hard to explain to users as fair.
3. **Super Reject = mutual permanent removal from each other's discovery pool + scarce personal charge on the sender** — accepted. It only affects the *pair*, is symmetric to what already happens on any reject (they stop seeing each other), amplified only by giving it "final boss" framing (VFX/copy) and by being a limited resource (cooldown/charge system) so it feels special without being able to touch a third party's global visibility.

## Decision
- **Super Reject**: A stronger, dramatized version of Reject. Effect: (a) guarantees the pair never resurfaces to each other in discovery (same as normal reject, made explicit/permanent), (b) consumes a limited personal charge that regenerates slowly or is earned, (c) has no effect whatsoever on the recipient's account state, visibility to *other* users, ability to log in, or ability to use the app. The recipient receives no special notification that a "Super" reject happened — from their perspective it's indistinguishable from a normal reject. All drama is client-side flavor for the *sender* only.
- **Shields**: Reframed from defensive item to a **positive consumable**. Consuming a Shield when making a Reject/Super Reject decision: (a) suppresses your own action from ever contributing a "you got rejected" signal shown to the other party (purely cosmetic dignity feature, see product principle #2), and/or (b) grants one "streak insurance" token usable to protect a Kill Streak from breaking due to an unmatch (see ADR-0003). Free earn path: awarded for Kill Streak milestones and daily engagement, in addition to purchasable packs.
- Both are modeled as explicit domain entities (`InventoryItem`, `Entitlement`) — never boolean flags — server-authoritative, never trusted from the client.

## Consequences
- Preserves the "you got Super Rejected" *comedic framing for the sender's own game experience* ("finishing move" flavor) without any real-world effect on the recipient.
- Removes all DoS/harassment/policy risk.
- Shields become a genuinely positive-sum purchase (buying upside, not buying-back-a-removed-threat), which is more defensible ethically and commercially.
- Must clearly communicate in onboarding/FAQ that Super Reject has no effect on the other person's account, to avoid user confusion/misplaced expectations if they've seen the marketing framing.
