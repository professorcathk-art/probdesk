"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { lang, setLang, strings } = useLanguage();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.85)]" />
          <span className="text-sm font-semibold tracking-[0.22em] text-slate-100">PROBDESK</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-2">
          <div
            className="mr-1 flex items-center rounded-full border border-white/10 bg-black/30 p-0.5 text-[11px] font-medium text-slate-300"
            role="group"
            aria-label={strings.nav.langToggle}
          >
            <button
              type="button"
              onClick={() => setLang("en")}
              className={cn(
                "rounded-full px-2.5 py-1 transition-colors",
                lang === "en" ? "bg-white/15 text-white shadow-sm" : "text-slate-400 hover:text-slate-200",
              )}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("zh")}
              className={cn(
                "rounded-full px-2.5 py-1 transition-colors",
                lang === "zh" ? "bg-white/15 text-white shadow-sm" : "text-slate-400 hover:text-slate-200",
              )}
            >
              繁
            </button>
          </div>
          <Link
            href="/square"
            className={cn(buttonVariants({ variant: "ghost" }), "text-slate-200 hover:bg-white/5 hover:text-white")}
          >
            {strings.nav.square}
          </Link>
          <Link
            href="/console"
            className={cn(buttonVariants({ variant: "ghost" }), "text-slate-200 hover:bg-white/5 hover:text-white")}
          >
            {strings.nav.console}
          </Link>
          {!isAuthenticated ? (
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "default" }),
                "galaxy-btn-glow border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25",
              )}
            >
              {strings.nav.enter}
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
