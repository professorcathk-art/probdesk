/**
 * Structured signals for hybrid guardrails — produced by AIML parse (any language).
 * Regex fallbacks live in hybrid-ai-suggestion-rules when this is missing/low-confidence.
 */

/** Mirrors `ExplicitPartnerSexTarget` in hybrid rules — duplicated to avoid circular imports. */
export type ParsedBinaryGenderPreference = "female" | "male";

export type MatchingGoalLane =
  | "romantic_partner"
  | "friendship_platonic"
  | "professional_hire_or_service"
  | "employment_seeking"
  | "mentorship_learning"
  | "cofounder_equity"
  | "investor_fundraising"
  | "general_networking"
  | "mixed_or_unclear";

export type IntentMatchingSignals = {
  goal_lane: MatchingGoalLane;
  /**
   * When the sender clearly wants peers of one binary gender (any language).
   * null = not stated / not applicable / LGBT+ non-binary-inclusive wording / unknown.
   */
  binary_gender_preference: ParsedBinaryGenderPreference | null;
};

export const FALLBACK_MIXED_SIGNALS: IntentMatchingSignals = {
  goal_lane: "mixed_or_unclear",
  binary_gender_preference: null,
};

const GOAL_LANE_SET = new Set<MatchingGoalLane>([
  "romantic_partner",
  "friendship_platonic",
  "professional_hire_or_service",
  "employment_seeking",
  "mentorship_learning",
  "cofounder_equity",
  "investor_fundraising",
  "general_networking",
  "mixed_or_unclear",
]);

/** When true, do not infer “opposite-sex default spouse” from vague family/long-term wording. */
export function matchingLaneSuppressesOppositeSexInference(lane: MatchingGoalLane): boolean {
  return (
    lane === "professional_hire_or_service" ||
    lane === "employment_seeking" ||
    lane === "mentorship_learning" ||
    lane === "cofounder_equity" ||
    lane === "investor_fundraising" ||
    lane === "general_networking"
  );
}

export function normalizeIntentMatchingSignals(raw: unknown): IntentMatchingSignals {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return FALLBACK_MIXED_SIGNALS;
  }
  const o = raw as Record<string, unknown>;
  const laneRaw = o.goal_lane;

  const lane: MatchingGoalLane =
    typeof laneRaw === "string" && GOAL_LANE_SET.has(laneRaw as MatchingGoalLane)
      ? (laneRaw as MatchingGoalLane)
      : "mixed_or_unclear";
  const g = o.binary_gender_preference;

  let binary_gender_preference: ParsedBinaryGenderPreference | null = null;
  if (g === "female" || g === "male") binary_gender_preference = g;
  else if (typeof g === "string") {
    const s = g.trim().toLowerCase();
    if (s === "female" || s === "f") binary_gender_preference = "female";
    else if (s === "male" || s === "m") binary_gender_preference = "male";
    else binary_gender_preference = null;
  }

  return { goal_lane: lane, binary_gender_preference };
}

export function embeddingNoteForMatchingSignals(s: IntentMatchingSignals | null | undefined): string {
  if (!s || s.goal_lane === "mixed_or_unclear") return "";
  const parts = [`matching_lane=${s.goal_lane.replace(/_/g, " ")}`];
  if (s.binary_gender_preference === "female") parts.push("seeks peers who present as woman");
  if (s.binary_gender_preference === "male") parts.push("seeks peers who present as man");
  if (parts.length <= 1) return `[Match hints: ${parts[0]}]`;
  return `[Match hints: ${parts.join("; ")}]`;
}
