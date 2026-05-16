-- One-time email alert when hybrid match quality first crosses threshold (see /api/cron/match-quality-alerts).

alter table public.profiles
  add column if not exists match_quality_alert_sent boolean not null default false;

comment on column public.profiles.match_quality_alert_sent is 'True after user received the single high-match discovery email.';
