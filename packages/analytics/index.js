/**
 * Canonical analytics event names (docs/04-domain-model.md §3). Producers
 * import from here rather than hand-typing event-name strings, so a rename
 * is a one-place change and typos can't silently create a new event.
 */
const EVENTS = Object.freeze({
  USER_REGISTERED: 'UserRegistered',
  EMAIL_VERIFIED: 'EmailVerified',
  LOGIN_SUCCEEDED: 'LoginSucceeded',
  LOGIN_FAILED: 'LoginFailed',
  PROFILE_COMPLETED: 'ProfileCompleted',
  PROFILE_UPDATED: 'ProfileUpdated',
  PHOTO_UPLOADED: 'PhotoUploaded',
  PHOTO_MODERATION_FLAGGED: 'PhotoModerationFlagged',
  DISCOVERY_SESSION_STARTED: 'DiscoverySessionStarted',
  PROFILE_VIEWED: 'ProfileViewed',
  LIKE_CREATED: 'LikeCreated',
  REJECT_CREATED: 'RejectCreated',
  MUTUAL_LIKE_DETECTED: 'MutualLikeDetected',
  MUTUAL_REJECT_DETECTED: 'MutualRejectDetected',
  MATCH_CREATED: 'MatchCreated',
  HUMBLE_MATCH_CREATED: 'HumbleMatchCreated',
  HUMBLE_MATCH_REVEALED: 'HumbleMatchRevealed',
  SUPER_REJECT_ACTIVATED: 'SuperRejectActivated',
  SHIELD_CONSUMED: 'ShieldConsumed',
  KILL_STREAK_STARTED: 'KillStreakStarted',
  KILL_STREAK_COMPLETED: 'KillStreakCompleted',
  KILL_STREAK_REVERSED: 'KillStreakReversed',
  POWER_UP_GRANTED: 'PowerUpGranted',
  BERSERKER_ACTIVATED: 'BerserkerActivated',
  MESSAGE_SENT: 'MessageSent',
  CONVERSATION_STARTED: 'ConversationStarted',
  USER_BLOCKED: 'UserBlocked',
  USER_REPORTED: 'UserReported',
  MODERATION_CASE_CREATED: 'ModerationCaseCreated',
  MODERATION_CASE_RESOLVED: 'ModerationCaseResolved',
  PAYMENT_COMPLETED: 'PaymentCompleted',
  PAYMENT_REFUNDED: 'PaymentRefunded',
  SUBSCRIPTION_ACTIVATED: 'SubscriptionActivated',
  ACCOUNT_DEACTIVATED: 'AccountDeactivated',
  ACCOUNT_DELETED: 'AccountDeleted',
});

const PRIVACY_CLASS = Object.freeze({
  NONE: 'NONE',
  PSEUDONYMOUS: 'PSEUDONYMOUS',
  PII: 'PII',
});

module.exports = { EVENTS, PRIVACY_CLASS };
