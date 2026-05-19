# Supabase: switch auth emails from magic link to OTP

Vennode’s login page uses **email OTP** (`verifyOtp` with `type: "email"`). Configure Supabase so messages include the **6-digit code**.

## Dashboard steps

1. Open **[Authentication → Email templates](https://supabase.com/dashboard/project/_/auth/templates)**.
2. Edit **Magic link** (used for `signInWithOtp`):
   - Include **`{{ .Token }}`** in the body — this is the **one-time 6-digit code**.
   - Optionally remove or shorten the clickable **`{{ .ConfirmationURL }}`** link so users rely on the code (recommended; avoids email scanners consuming links).
3. Optionally adjust **Confirm signup** the same way if new users confirm email.
4. **[Authentication → URL configuration](https://supabase.com/dashboard/project/_/auth/url-configuration)**  
   - Keep **Site URL** and **Redirect URLs** correct for OAuth (Google still uses `/auth/callback`).  
   - OTP sign-in does **not** need `/auth/callback` for the happy path; Vennode redirects to **`/auth/complete`** after the code is verified.

## SMTP

If you use **custom SMTP**, no extra OTP toggle is required — the same sender delivers the template.

## Reference

- [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates) (`{{ .Token }}`, prefetch / Safe Links note).
