# Contact form (`/contact` → `POST /api/contact`)

Symptoms:

- **`502 Bad Gateway`** from `POST https://your-domain/api/contact`: the handler ran but **Resend rejected the send** or a network/SDK error occurred. Check **Vercel → Project → Logs** for `[api/contact] email send failed` with `fault: "provider"` and the `detail` message (often API limits or onboarding-sender recipient rules).
- **`503`** with JSON `error: "misconfigured"`: **`RESEND_API_KEY`** is missing in the deployment environment.

## Required Vercel environment variables

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key (`re_...`) |

## Optional environment variables

| Variable | Purpose |
|----------|---------|
| `CONTACT_SUPPORT_EMAIL` | Where contact deliveries go (`professor.cat.hk@gmail.com` in code if unset). |

**From:** All Resend sends use **`onboarding@resend.dev`** (`RESEND_SIMPLE_FROM` — Resend default; only **`RESEND_API_KEY`** needed).

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
