-- Structured signals for hybrid guardrails (LLM-produced; language-agnostic vs regex-only heuristics).
alter table public.intent_requests add column if not exists matching_signals jsonb;

comment on column public.intent_requests.matching_signals is
  'AIML-derived { goal_lane, binary_gender_preference } — see parseIntentWithMini / lib/intent-matching-signals.ts';
