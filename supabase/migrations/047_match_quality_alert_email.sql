-- Legacy column: one-time high-match flag from removed cron (Phase 15 uses ai_recommendations + /api/cron/daily-digest).

alter table public.profiles
  add column if not exists match_quality_alert_sent boolean not null default false;

comment on column public.profiles.match_quality_alert_sent is 'True after user received the single high-match discovery email.';
