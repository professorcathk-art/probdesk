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
| `RESEND_FROM_EMAIL` | **From** address. If unset, the contact form uses Resend's **`onboarding@resend.dev`** (no domain verification). Set to a verified sender (e.g. `Vennode <notify@yourdomain.com>`) for production branding and deliverability. |
| `CONTACT_SUPPORT_EMAIL` | Where contact form deliveries go (defaults to `professor.cat.hk@gmail.com` in code). |

**Note:** `onboarding@resend.dev` is intended for testing; Resend may restrict which recipient addresses receive mail. Prefer a verified domain + `RESEND_FROM_EMAIL` for production.

See also **`.env.example`**.

## Resend checklist

1. **`RESEND_API_KEY`** alone is enough for **`POST /api/contact`** to send using **`onboarding@resend.dev`** as **From**.
2. For production, verify your domain in [Resend](https://resend.com/) and set **`RESEND_FROM_EMAIL`** to that verified sender; unverified custom domains produce **502** from Resend.
3. After changing env vars, **redeploy** (or trigger a new deployment) so serverless functions pick them up.

## Local verification

With `.env.local` populated:

```bash
curl -sS -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"email":"you@test.com","subject":"Test","message":"At least twenty characters here."}'
```

Expect `{"ok":true}` and an email at `CONTACT_SUPPORT_EMAIL`.
