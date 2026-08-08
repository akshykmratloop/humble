/** Kill Streak rules — see docs/adr/0003-kill-streak-state-machine.md. */

const GRACE_WINDOW_HOURS = 24;
const INACTIVITY_RESET_DAYS = 7;
const VELOCITY_WINDOW_MINUTES = 5;
const MILESTONES = [3, 5, 10];

function graceExpiresAt(matchCreatedAt) {
  return new Date(matchCreatedAt.getTime() + GRACE_WINDOW_HOURS * 60 * 60 * 1000);
}

function isInactivityResetDue(lastQualifyingAt, now) {
  if (!lastQualifyingAt) return false;
  const days = (now.getTime() - lastQualifyingAt.getTime()) / (1000 * 60 * 60 * 24);
  return days > INACTIVITY_RESET_DAYS;
}

/** Enforces "at most one streak-qualifying increment per rolling 5-minute window". */
function isWithinVelocityLimit(lastIncrementAt, now) {
  if (!lastIncrementAt) return true;
  const minutes = (now.getTime() - lastIncrementAt.getTime()) / (1000 * 60);
  return minutes >= VELOCITY_WINDOW_MINUTES;
}

function isMilestone(count) {
  return MILESTONES.includes(count);
}

module.exports = {
  GRACE_WINDOW_HOURS,
  INACTIVITY_RESET_DAYS,
  VELOCITY_WINDOW_MINUTES,
  MILESTONES,
  graceExpiresAt,
  isInactivityResetDue,
  isWithinVelocityLimit,
  isMilestone,
};
