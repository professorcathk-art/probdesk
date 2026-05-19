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
4. **`match_profiles`** requires **`profiles.supply_embedding`** and onboarding complete. Candidate **location** for filtering uses **`profiles.location`** with fallback to the member’s latest **active** intent’s **`location_filter`** (migration `067`). **`syncProfileEmbedding`** includes the latest active listing text in the supply vector so dating-style complements surface in retrieval.
5. Migration **`068`** drops **`profiles_supply_embedding_ivfflat`**: on small/partial corpora, IVFFLAT can return **zero** neighbors (false empty pool). Sequential scan is used until you add HNSW or a tuned IVFFLAT at scale. Server logs **`[syncProfileEmbedding]`** if the profile vector write fails (previously swallowed).
6. Migration **`069`** adds **`match_intents_cross_demand`** (and drops **`intent_requests_demand_embedding_ivfflat`**): when **`match_profiles`** still returns no rows, discovery falls back to comparing your **demand** embedding to each peer’s latest active intent **`demand_embedding`** (legacy behavior). Admin **`meta.retrieval_model`** is **`demand_vs_peer_intent_demand`** on that path.

## Daily digest email (`ai_recommendations`)

Phase 15 replaces heavyweight cron-side LLM matching with a **lightweight mailman**:

- **Vercel Cron** calls **`GET /api/cron/daily-digest`** once per day (see `vercel.json`; default **`0 14 * * *`** UTC).
- Auth: **`Authorization: Bearer CRON_SECRET`** plus **`RESEND_API_KEY`** / **`RESEND_FROM_EMAIL`**.
- The job selects **`ai_recommendations`** rows where **`email_sent = false`** and **`dismissed_at` is null**, groups them by the **intent owner’s email**, sends one Resend message per member (“You have N new AI recommendations…”), then marks those rows **`email_sent = true`**.
- **`computeHybridSuggestions`** still runs **vector retrieval + LLM vibe scoring synchronously** and returns the top 3 immediately to the UI; those rows are **also inserted** into **`ai_recommendations`** for later digest if untouched.
- **Background embedding matches**: profile saves **`await syncProfileEmbedding`** then **`generateBackgroundMatchesForProfileUser`** (service role + **`match_active_intents_for_supply`**) inserts **`background_supply`** rows when similarity ≥ 80 — **no LLM** on that path.
- **`admin_email_logs`** captures each cron summary; **`/admin/email-logs`** lists runs plus unsent queue size.

Legacy **`profiles.match_quality_alert_sent`** and the removed **`/api/cron/match-quality-alerts`** route are obsolete once Phase 15 is deployed.

## Google login: “Continue to …supabase.co”

Google shows the **OAuth redirect host**. With default Supabase hosted Auth, that host is often **`*.supabase.co`**.

To show **your domain**:

1. In **Supabase Dashboard** → Project Settings → **Custom domains** (or Auth URL configuration): add an Auth subdomain on **your** domain (e.g. `auth.yourdomain.com`) per Supabase docs.
2. In **Google Cloud Console** → OAuth client → **Authorized redirect URIs**, add the Supabase callback URLs that use **your** Auth domain (Supabase documents the exact paths).
3. Update your app’s **`NEXT_PUBLIC_SUPABASE_URL`** (and any client auth config) if your project uses the custom Auth URL.

The **OAuth consent screen “home page” / app name** is edited separately in Google Cloud; it does not change the redirect hostname until custom Auth domain + redirects are correct.

## Inbound sender preview (trust)

New invites store **`ai_context_sender`** as **`preview_kind: factual_v1`** — a copy of **saved profile fields only**, not LLM-invented traits. Older rows may show a legacy notice instead of paraphrased text.
