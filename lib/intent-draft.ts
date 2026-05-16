/** Matches onboarding / console validation for natural-language intent drafts */
export const MIN_INTENT_CHARS = 12;

export const LANDING_INTENT_SESSION_KEY = "vennode-landing-intent-draft";

export const LANDING_INTENT_LOCAL_STORAGE_KEY = "vennode-landing-intent-ls";

export function persistLandingIntentDraft(text: string) {
  try {
    sessionStorage.setItem(LANDING_INTENT_SESSION_KEY, text);
  } catch {
    /* private mode */
  }
  try {
    localStorage.setItem(LANDING_INTENT_LOCAL_STORAGE_KEY, text);
  } catch {
    /* private mode */
  }
}

/** Prefer sessionStorage (same-tab OAuth), then localStorage as cross-navigation backup */
export function readLandingIntentDraftBackup(): string | null {
  try {
    const s = sessionStorage.getItem(LANDING_INTENT_SESSION_KEY)?.trim() ?? "";
    if (s.length >= MIN_INTENT_CHARS) return s;
  } catch {
    /* noop */
  }
  try {
    const l = localStorage.getItem(LANDING_INTENT_LOCAL_STORAGE_KEY)?.trim() ?? "";
    if (l.length >= MIN_INTENT_CHARS) return l;
  } catch {
    /* noop */
  }
  return null;
}

export function clearLandingIntentDraftBackups() {
  try {
    sessionStorage.removeItem(LANDING_INTENT_SESSION_KEY);
  } catch {
    /* noop */
  }
  try {
    localStorage.removeItem(LANDING_INTENT_LOCAL_STORAGE_KEY);
  } catch {
    /* noop */
  }
}
