/** Max concurrently active intent requests per non-admin user (`intent_requests.status === 'active'`). */
export const MAX_ACTIVE_INTENTS_PER_USER = 3;

/** Outbound connection invites allowed per UTC calendar day (non-admin). Must match DB RPC reset value. */
export const DAILY_OUTBOUND_INVITE_CREDITS = 5;
