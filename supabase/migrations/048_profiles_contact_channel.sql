-- Optional contact preferences for onboarding (never shown publicly until mutual consent).
alter table public.profiles
  add column if not exists preferred_contact_channel text,
  add column if not exists preferred_contact_detail text;

comment on column public.profiles.preferred_contact_channel is 'whatsapp | line | wechat — optional; validated in app; never shared before mutual consent.';
comment on column public.profiles.preferred_contact_detail is 'Handle / ID / free text for the chosen channel; never shared before mutual consent.';
