-- Curated marketplace showcases: invites route to MARKETPLACE_DEMO_INBOX_USER_ID on the server.
alter table public.intent_requests
  add column if not exists is_demo_listing boolean not null default false;

comment on column public.intent_requests.is_demo_listing is 'When true, initiateConnection sends the Pending invite to MARKETPLACE_DEMO_INBOX_USER_ID instead of intent owner.';

create index if not exists intent_requests_demo_listing_idx
  on public.intent_requests (is_demo_listing)
  where is_demo_listing = true;
