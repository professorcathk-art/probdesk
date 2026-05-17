-- Scope outbound invites from Manage → discovery to the sender's intent (dashboard grouping).
alter table public.matches add column if not exists sender_context_intent_id uuid references public.intent_requests (id) on delete set null;

comment on column public.matches.sender_context_intent_id is 'Sender intent when an outbound Pending invite was started from that intent''s discovery flow (Manage).';
