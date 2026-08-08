import { describe, it, expect } from 'vitest';
const { canInitiate, DEFAULT_POLICY } = require('../conversationPolicy');

describe('canInitiate', () => {
  it('allows either party under the MVP default EITHER policy', () => {
    expect(canInitiate(DEFAULT_POLICY, 'user-a')).toBe(true);
    expect(canInitiate(DEFAULT_POLICY, 'user-b')).toBe(true);
  });

  it('restricts initiation to the designated party under a restrictive policy', () => {
    const policy = { initiatorRule: 'POLICY_DESIGNATED_PARTY', designatedUserId: 'user-a' };
    expect(canInitiate(policy, 'user-a')).toBe(true);
    expect(canInitiate(policy, 'user-b')).toBe(false);
  });

  it('a valid entitlement override grants initiation even when not designated', () => {
    const policy = { initiatorRule: 'POLICY_DESIGNATED_PARTY', designatedUserId: 'user-a' };
    expect(canInitiate(policy, 'user-b', true)).toBe(true);
  });
});
