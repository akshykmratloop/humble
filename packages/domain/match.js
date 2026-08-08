/**
 * Normalizes an unordered user pair into (low, high) order so a unique DB
 * constraint on (userLowId, userHighId) can enforce "exactly one Match per pair"
 * regardless of which user acted first. See docs/07-database-design.md §3.
 */
function normalizePair(userIdA, userIdB) {
  return userIdA < userIdB
    ? { userLowId: userIdA, userHighId: userIdB }
    : { userLowId: userIdB, userHighId: userIdA };
}

/**
 * Pure decision-evaluation rule (docs/06-lld.md §4 / docs/adr/0006).
 * Given both parties' decisions on each other, returns the resulting match
 * type, or null if no match should be created.
 *
 * @param {'LIKE'|'REJECT'} deciderDecision
 * @param {'LIKE'|'REJECT'|null} counterDecision - null if the other party hasn't decided yet
 * @param {{ deciderOptedOutOfHumble: boolean, targetOptedOutOfHumble: boolean }} opts
 * @returns {'NORMAL'|'HUMBLE'|null}
 */
function evaluateMatchOutcome(deciderDecision, counterDecision, opts) {
  if (!counterDecision || counterDecision !== deciderDecision) {
    return null;
  }
  if (deciderDecision === 'LIKE') {
    return 'NORMAL';
  }
  // Both REJECT: Humble Match, unless either party opted out (FR-06 / INV-12).
  if (opts.deciderOptedOutOfHumble || opts.targetOptedOutOfHumble) {
    return null;
  }
  return 'HUMBLE';
}

module.exports = { normalizePair, evaluateMatchOutcome };
