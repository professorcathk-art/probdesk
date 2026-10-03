"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

export function Footer() {
  const { strings } = useLanguage();
  const F = strings.footer;

  return (
    <footer className="mt-auto border-t border-[#eee] bg-white px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500" aria-label="Footer">
          <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-slate-900">
            {F.privacy}
          </Link>
          <Link href="/policy" className="inline-flex min-h-11 items-center hover:text-slate-900">
            {F.policy}
          </Link>
          <Link href="/contact" className="inline-flex min-h-11 items-center hover:text-slate-900">
            {F.contact}
          </Link>
        </nav>
        <p className="text-sm text-slate-400">{F.copyright}</p>
      </div>
    </footer>
  );
}
