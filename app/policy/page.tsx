import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Terms & Site Policy — Vennode",
  description: "Terms of service and site policies for Vennode.",
};

export default function PolicyPage() {
  return (
    <LegalDocument title="Terms of Service & Site Policy" updated="May 16, 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of Vennode at{" "}
        <Link href="https://vennode.com">vennode.com</Link> and related services (&quot;Vennode&quot;). By accessing or
        using Vennode, you agree to these Terms and our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>1. The service</h2>
      <p>
        Vennode helps people describe what they are looking for and discover mutually acceptable introductions. Features
        may include Smart Matchmaking, Explore listings, messaging after mutual acceptance, and administrative tools.
        We may change or discontinue features with reasonable notice where practicable.
      </p>

      <h2>2. Eligibility &amp; accounts</h2>
      <p>
        You must be legally able to enter a contract in your jurisdiction and meet any minimum age we specify (see our
        Privacy Policy). You are responsible for your account credentials and for activity under your account.
      </p>

      <h2>3. Your content</h2>
      <p>
        You retain rights to content you submit. You grant Vennode a worldwide, non-exclusive license to host, process,
        display, and distribute your content solely to operate and improve the service (including matching,
        moderation, and safety). You represent that you have the rights needed to grant this license.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Harass, threaten, defraud, or spam others;</li>
        <li>Post illegal content or content that infringes others&apos; rights;</li>
        <li>Attempt to bypass mutual-consent or anonymity protections;</li>
        <li>Scrape, overload, or probe our systems beyond normal use;</li>
        <li>Misrepresent your identity or intentions in a materially deceptive way.</li>
      </ul>
      <p>
        We may suspend or terminate accounts that violate these rules or pose risk to the community, subject to
        applicable law.
      </p>

      <h2>5. Matching &amp; introductions</h2>
      <p>
        Vennode provides tools and suggestions; we do not guarantee any outcome. You are responsible for your own
        interactions after connecting. Use appropriate caution when meeting people offline.
      </p>

      <h2>6. Third-party services</h2>
      <p>
        Sign-in, hosting, AI, email, and analytics may be provided by third parties. Their terms and privacy practices
        may also apply.
      </p>

      <h2>7. Disclaimers</h2>
      <p>
        Vennode is provided &quot;as is&quot; without warranties of any kind, to the fullest extent permitted by law.
        We do not warrant uninterrupted or error-free operation.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Vennode and its operators will not be liable for indirect, incidental,
        special, consequential, or punitive damages, or any loss of profits or data, arising from your use of the
        service.
      </p>

      <h2>9. Indemnity</h2>
      <p>
        You will defend and indemnify Vennode against claims arising from your content or misuse of the service, except
        to the extent caused by our wilful misconduct.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by the laws applicable to the operating entity behind Vennode, without regard to
        conflict-of-law rules. Courts in that jurisdiction will have exclusive venue unless mandatory consumer laws say
        otherwise.
      </p>

      <h2>11. Contact</h2>
      <p>
        For legal or policy questions, contact us using the support channel identified on{" "}
        <Link href="https://vennode.com">vennode.com</Link> or through your account settings when available.
      </p>
    </LegalDocument>
  );
}
