import { describe, it, expect } from 'vitest';
const { normalizePair, evaluateMatchOutcome } = require('../match');

describe('normalizePair', () => {
  it('orders ids lexicographically regardless of input order', () => {
    expect(normalizePair('b', 'a')).toEqual({ userLowId: 'a', userHighId: 'b' });
    expect(normalizePair('a', 'b')).toEqual({ userLowId: 'a', userHighId: 'b' });
  });
});

describe('evaluateMatchOutcome', () => {
  const noOptOut = { deciderOptedOutOfHumble: false, targetOptedOutOfHumble: false };

  it('returns null when the other party has not decided yet', () => {
    expect(evaluateMatchOutcome('LIKE', null, noOptOut)).toBeNull();
  });

  it('returns null when decisions disagree (rejection has dignity)', () => {
    expect(evaluateMatchOutcome('LIKE', 'REJECT', noOptOut)).toBeNull();
    expect(evaluateMatchOutcome('REJECT', 'LIKE', noOptOut)).toBeNull();
  });

  it('returns NORMAL on mutual like', () => {
    expect(evaluateMatchOutcome('LIKE', 'LIKE', noOptOut)).toBe('NORMAL');
  });

  it('returns HUMBLE on mutual reject when neither opted out', () => {
    expect(evaluateMatchOutcome('REJECT', 'REJECT', noOptOut)).toBe('HUMBLE');
  });

  it('returns null on mutual reject when the decider opted out (INV-12)', () => {
    expect(
      evaluateMatchOutcome('REJECT', 'REJECT', {
        deciderOptedOutOfHumble: true,
        targetOptedOutOfHumble: false,
      }),
    ).toBeNull();
  });

  it('returns null on mutual reject when the target opted out (INV-12)', () => {
    expect(
      evaluateMatchOutcome('REJECT', 'REJECT', {
        deciderOptedOutOfHumble: false,
        targetOptedOutOfHumble: true,
      }),
    ).toBeNull();
  });
});
