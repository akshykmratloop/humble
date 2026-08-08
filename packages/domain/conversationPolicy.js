/**
 * Resolves whether a user may send the first message in a conversation.
 * MVP ships a single default policy (EITHER party may initiate) per
 * docs/06-lld.md §4 — richer per-match-type policies are modeled but not
 * required until product data shows a need (docs/01-prd.md FR-09).
 *
 * @param {{ initiatorRule: 'EITHER'|'POLICY_DESIGNATED_PARTY', designatedUserId?: string }} policy
 * @param {string} senderId
 * @param {boolean} hasInitiationOverrideEntitlement - e.g. an active Berserker entitlement (post-MVP)
 * @returns {boolean}
 */
function canInitiate(policy, senderId, hasInitiationOverrideEntitlement = false) {
  if (policy.initiatorRule === 'EITHER') return true;
  if (hasInitiationOverrideEntitlement) return true;
  return policy.designatedUserId === senderId;
}

const DEFAULT_POLICY = Object.freeze({ initiatorRule: 'EITHER', initiationWindowHours: 168 });

module.exports = { canInitiate, DEFAULT_POLICY };
