# Matching, pairing logs, email alerts, and Google OAuth branding

This note answers common operations questions for Vennode / Probdesk.

## Pairing score log (Admin)

Rows are written **server-side** with the Supabase **service role** into `pairing_score_events`.

- **`hybrid_suggestion`** — Emitted when someone runs discovery (**「尋找契合對象」** / Find people who fit) from Manage. You should see one row per ranked candidate (plus optional diagnostics when the candidate pool is empty).
- **`invite_vibe`** — Emitted when a member sends a connection invite (vibe scoring path).
- **`admin_system_match`** — Emitted when an admin creates a cold-start system match.

**If the admin log stays empty after discovery:**

1. Confirm **`SUPABASE_SERVICE_ROLE_KEY`** is set in the **production** Next.js / Vercel environment (without it, inserts are skipped and errors are logged server-side).
2. Check server logs for **`[pairing_score_events]`** insert failures.
3. Run discovery again after deploy; an empty candidate pool still produces a diagnostic row with `excluded_reason` set (e.g. `empty_rpc_retrieval`).

## “Daily” match email — what actually runs

There is **no** job that continuously discovers new matches for every intent and emails full match lists.

What exists today:

- **Vercel Cron** calls **`GET /api/cron/match-quality-alerts`** once per day (see `vercel.json`; schedule **`0 14 * * *`** → 14:00 UTC).
- The route requires **`Authorization: Bearer CRON_SECRET`** and valid **`RESEND_*`** env vars.
- For each profile where **`match_quality_alert_sent` is false**, it evaluates hybrid match quality for that user’s latest active intent (with embedding + location). If the best score is **≥ `MATCH_QUALITY_ALERT_MIN_SCORE`** (default 80) and the peer isn’t blocked, it sends **one** high-match alert email and sets **`match_quality_alert_sent = true`** — so it is **one-time per profile**, not a digest of every new suggestion.

## Google login: “Continue to …supabase.co”

Google shows the **OAuth redirect host**. With default Supabase hosted Auth, that host is often **`*.supabase.co`**.

To show **your domain**:

1. In **Supabase Dashboard** → Project Settings → **Custom domains** (or Auth URL configuration): add an Auth subdomain on **your** domain (e.g. `auth.yourdomain.com`) per Supabase docs.
2. In **Google Cloud Console** → OAuth client → **Authorized redirect URIs**, add the Supabase callback URLs that use **your** Auth domain (Supabase documents the exact paths).
3. Update your app’s **`NEXT_PUBLIC_SUPABASE_URL`** (and any client auth config) if your project uses the custom Auth URL.

The **OAuth consent screen “home page” / app name** is edited separately in Google Cloud; it does not change the redirect hostname until custom Auth domain + redirects are correct.

## Inbound sender preview (trust)

New invites store **`ai_context_sender`** as **`preview_kind: factual_v1`** — a copy of **saved profile fields only**, not LLM-invented traits. Older rows may show a legacy notice instead of paraphrased text.
