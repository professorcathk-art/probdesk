import type { AiRecommendationListItem } from "@/actions/ai-recommendations";
import type { SuggestionCard } from "@/actions/intents";

const PROFILE_STUB = "(Profile supply only — no linked Explore listing.)";

/** Maps persisted recommendation rows into the same shape used by ConnectModal / discovery UI. */
export function aiRecommendationToSuggestionCard(row: AiRecommendationListItem): SuggestionCard {
  const text =
    row.peer_bio?.trim() ||
    row.peer_superpower?.trim() ||
    row.peer_industry?.trim() ||
    PROFILE_STUB;

  return {
    intent_id: row.peer_linked_intent_id,
    owner_user_id: row.candidate_profile_id,
    natural_language_input: text,
    extracted_persona: null,
    location_filter: row.peer_location,
    distance: 0,
    similarity: Math.min(1, Math.max(0, row.score / 100)),
    discovery_source: row.peer_linked_intent_id ? "intent" : "profile",
    peer_display_name: row.peer_display_name,
    peer_bio: row.peer_bio,
    peer_gender: row.peer_gender,
    peer_age_group: row.peer_age_group,
    peer_skills_tags: row.peer_skills_tags,
    peer_languages: row.peer_languages,
    match_score: row.score,
    compatibility_reason: row.reason ?? "",
  };
}
