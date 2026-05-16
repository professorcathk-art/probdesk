"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

export function Footer() {
  const { strings } = useLanguage();
  const F = strings.footer;

  return (
    <footer className="mt-auto border-t border-white/10 bg-black/40 px-4 py-8 backdrop-blur-xl sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <nav
          className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-400 sm:gap-x-6"
          aria-label="Footer"
        >
          <Link href="/privacy" className="min-h-11 inline-flex items-center hover:text-slate-200 sm:min-h-0">
            {F.privacy}
          </Link>
          <Link href="/policy" className="min-h-11 inline-flex items-center hover:text-slate-200 sm:min-h-0">
            {F.policy}
          </Link>
          <Link href="/contact" className="min-h-11 inline-flex items-center hover:text-slate-200 sm:min-h-0">
            {F.contact}
          </Link>
          <Link href="/" className="min-h-11 inline-flex items-center hover:text-slate-200 sm:min-h-0">
            {F.home}
          </Link>
        </nav>
        <p className="text-sm text-slate-500">{F.copyright}</p>
      </div>
    </footer>
  );
}
