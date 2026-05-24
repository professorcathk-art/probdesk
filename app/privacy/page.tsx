import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy — Vennode",
  description: "How Vennode collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Policy" updated="May 19, 2026">
      <p>
        Vennode (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the service available at{" "}
        <Link href="https://vennode.com">vennode.com</Link>. This Privacy Policy explains how we handle information when
        you use our matching and messaging features. By using Vennode, you agree to this policy.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> email address and authentication identifiers from your sign-in provider (for
          example Google).
        </li>
        <li>
          <strong>Profile &amp; intent content:</strong> text you provide when describing yourself and what you are
          looking for, optional profile fields (such as demographics or orientation if you voluntarily choose them),
          and location hints you choose to share for matching.
        </li>
        <li>
          <strong>Usage &amp; technical data:</strong> basic diagnostics such as device/browser type, timestamps, and logs
          needed to operate and secure the service.
        </li>
        <li>
          <strong>Communications:</strong> messages you send through Vennode after a mutual connection is established,
          subject to our retention rules and safety tooling.
        </li>
      </ul>

      <h2>2. How we use information</h2>
      <p>We use the above to:</p>
      <ul>
        <li>Create and secure your account;</li>
        <li>Operate Smart Matchmaking and Explore features, including embeddings and compatibility scoring;</li>
        <li>Deliver transactional emails (for example sign-in and important account notices);</li>
        <li>Detect abuse, enforce our terms, and comply with law.</li>
      </ul>

      <h3>AI-assisted matching engine</h3>
      <p>
        Information you voluntarily provide—such as your profile text, descriptions of what you are looking for,
        optional demographic or preference fields, and similar content you enter in the product—may be analyzed,
        summarized, embedded, scored, filtered, or otherwise processed using automated systems operated by Vennode or
        our subcontractors (including machine-learning and similarity models).
      </p>
      <p>
        <strong>This processing is inherent to Vennode:</strong> it powers ranking, discovery, compatibility cues,
        and internal guardrails. It does <strong>not</strong> constitute professional advice, background screening, or a
        guarantee of suitability. Model outputs may be probabilistic or incomplete.
      </p>
      <p>
        Disclosure of identifiable details (such as legal name, photos, albums, contacts, social links, and similar
        fields) follows the product&apos;s phased privacy UX and mutual-connection rules—they are separate from the
        fact that descriptive text used for introductions may inform AI-assisted matching internally.
      </p>

      <h2>3. Sharing</h2>
      <p>
        We use infrastructure and AI vendors (for example hosting and model APIs) who process data only to provide the
        service. We do not sell your personal information. We may disclose information if required by law or to protect
        rights and safety.
      </p>

      <h2>4. Retention</h2>
      <p>
        We retain information as long as your account is active and as needed for legal, security, and analytics
        purposes. You may request deletion of your account subject to applicable law and legitimate business needs (for
        example fraud prevention).
      </p>

      <h2>5. Your choices</h2>
      <ul>
        <li>Update profile and intent content in the product;</li>
        <li>Adjust visibility settings where offered (for example Explore listings);</li>
        <li>Contact us regarding access or deletion requests where applicable.</li>
      </ul>

      <h2>6. International transfers</h2>
      <p>
        If you access Vennode from outside the country where our servers or vendors operate, your information may be
        transferred and processed across borders with appropriate safeguards where required.
      </p>

      <h2>7. Children</h2>
      <p>Vennode is not directed at children under 16. We do not knowingly collect their personal information.</p>

      <h2>8. Changes</h2>
      <p>
        We may update this policy from time to time. We will post the new date at the top of this page and, where
        appropriate, notify you in the product or by email.
      </p>
    </LegalDocument>
  );
}
