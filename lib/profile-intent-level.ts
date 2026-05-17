export const INTENT_LEVEL_KEYS = ["casual_open", "intentional_seeking", "focused_commit"] as const;
export type IntentLevelKey = (typeof INTENT_LEVEL_KEYS)[number];

export function parseIntentLevel(raw: string | null | undefined): IntentLevelKey | null {
  const t = raw?.trim() ?? "";
  if (!t) return null;
  return (INTENT_LEVEL_KEYS as readonly string[]).includes(t) ? (t as IntentLevelKey) : null;
}
