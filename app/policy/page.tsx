import type { Metadata } from "next";
import { PolicyBody } from "@/components/policy-body";

export const metadata: Metadata = {
  title: "Terms & Site Policy — Vennode",
  description: "Terms of service for Vennode, including offline payment and prohibited sexual activities.",
};

export default function PolicyPage() {
  return <PolicyBody />;
}
