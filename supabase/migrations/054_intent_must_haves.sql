-- Phase 10: hard constraints on intents for matching

alter table public.intent_requests add column if not exists must_haves text;

comment on column public.intent_requests.must_haves is 'Dealbreakers / must-have criteria for matching (nullable).';
