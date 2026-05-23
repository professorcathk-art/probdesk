# Contact form (`/contact` → `POST /api/contact`)

Symptoms:

- **`502 Bad Gateway`** from `POST https://your-domain/api/contact`: the handler ran but **Resend rejected the send** or a network/SDK error occurred. Check **Vercel → Project → Logs** for `[api/contact] email send failed` with `fault: "provider"` and the `detail` message (often domain/sender verification).
- **`503`** with JSON `error: "misconfigured"`: **`RESEND_API_KEY`** is missing in the deployment environment.

## Required Vercel environment variables

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key (`re_...`) |

## Optional environment variables

| Variable | Purpose |
|----------|---------|
| `RESEND_FROM_EMAIL` | Unused by current outbound mail helpers; **From** is fixed in **`lib/resend-simple-from.ts`**. |
| `CONTACT_SUPPORT_EMAIL` | Where contact deliveries go (`professor.cat.hk@gmail.com` in code if unset). |

**From:** `POST /api/contact` and **`GET /api/cron/daily-digest`** emails use **`onboarding@resend.dev`** plus **`RESEND_API_KEY`** (Resend onboarding sender — no verified domain).

`onboarding@resend.dev` may restrict recipients on free tier; upgrade to a verified domain and switch the code’s **`RESEND_SIMPLE_FROM`** in `lib/resend-simple-from.ts` when ready.

See also **`.env.example`**.

## Resend checklist

1. **`RESEND_API_KEY`** drives both **`POST /api/contact`** and **`/api/cron/daily-digest`** with **`onboarding@resend.dev`** as **From**.
2. After changing env vars, **redeploy** so serverless functions pick them up.

## Local verification

With `.env.local` populated:

```bash
curl -sS -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"email":"you@test.com","subject":"Test","message":"At least ten characters."}'
```

Expect `{"ok":true}` and an email at `CONTACT_SUPPORT_EMAIL`.
