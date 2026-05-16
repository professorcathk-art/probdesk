import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Vennode",
  description: "Reach the Vennode support team with questions about matching, your account, or safety.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
