import { describe, it, expect } from 'vitest';
const {
  graceExpiresAt,
  isInactivityResetDue,
  isWithinVelocityLimit,
  isMilestone,
  GRACE_WINDOW_HOURS,
} = require('../streak');

describe('graceExpiresAt', () => {
  it('adds the grace window in hours', () => {
    const created = new Date('2026-01-01T00:00:00.000Z');
    const expires = graceExpiresAt(created);
    expect(expires.getTime() - created.getTime()).toBe(GRACE_WINDOW_HOURS * 60 * 60 * 1000);
  });
});

describe('isInactivityResetDue', () => {
  it('is false with no prior qualifying event', () => {
    expect(isInactivityResetDue(null, new Date())).toBe(false);
  });

  it('is false within the 7-day window', () => {
    const last = new Date('2026-01-01T00:00:00.000Z');
    const now = new Date('2026-01-05T00:00:00.000Z');
    expect(isInactivityResetDue(last, now)).toBe(false);
  });

  it('is true past the 7-day window', () => {
    const last = new Date('2026-01-01T00:00:00.000Z');
    const now = new Date('2026-01-10T00:00:00.000Z');
    expect(isInactivityResetDue(last, now)).toBe(true);
  });
});

describe('isWithinVelocityLimit (anti farm-by-rapid-matching)', () => {
  it('allows the first increment with no prior timestamp', () => {
    expect(isWithinVelocityLimit(null, new Date())).toBe(true);
  });

  it('blocks a second increment inside the 5-minute window', () => {
    const last = new Date('2026-01-01T00:00:00.000Z');
    const now = new Date('2026-01-01T00:02:00.000Z');
    expect(isWithinVelocityLimit(last, now)).toBe(false);
  });

  it('allows an increment once 5 minutes have elapsed', () => {
    const last = new Date('2026-01-01T00:00:00.000Z');
    const now = new Date('2026-01-01T00:05:00.000Z');
    expect(isWithinVelocityLimit(last, now)).toBe(true);
  });
});

describe('isMilestone', () => {
  it('flags configured milestone counts', () => {
    expect(isMilestone(3)).toBe(true);
    expect(isMilestone(4)).toBe(false);
    expect(isMilestone(5)).toBe(true);
  });
});
