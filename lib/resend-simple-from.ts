/**
 * Resend **default onboarding** From address — API key only, no verified custom domain.
 * All app emails (contact form, digest, connection notices) use this constant.
 *
 * Do not swap to ENV-based “notify@yourdomain.com” unless you deliberately add verified-domain support.
 *
 * @see https://resend.com/docs/send-with-verified-domain-resend-vs-onboarding-domain
 */
export const RESEND_SIMPLE_FROM = "onboarding@resend.dev";
