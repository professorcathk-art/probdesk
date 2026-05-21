"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, UserRound } from "lucide-react";
import { getMessengerUnreadThreadCount } from "@/actions/messenger";
import { useLanguage } from "@/components/language-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function MessagesNavLink({
  ariaLabel,
  messengerUnreadInitial,
}: {
  ariaLabel: string;
  messengerUnreadInitial: number;
}) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(messengerUnreadInitial);

  useEffect(() => {
    queueMicrotask(() => setUnread(messengerUnreadInitial));
  }, [messengerUnreadInitial]);

  /** Debounced: rapid route changes only fire one server round-trip → snappier nav + fewer actions. */
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        const res = await getMessengerUnreadThreadCount();
        if (cancelled) return;
        if (typeof res === "number") setUnread(res);
      })();
    }, 550);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pathname]);

  return (
    <Link
      href="/messages"
      aria-label={ariaLabel}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "relative inline-flex h-11 min-h-11 w-11 shrink-0 touch-manipulation items-center justify-center px-0 text-slate-200 hover:bg-white/5 hover:text-white sm:h-9 sm:min-h-8 sm:w-9",
      )}
    >
      <MessageCircle className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
      {unread > 0 ? (
        <span
          className="pointer-events-none absolute right-[10px] top-[10px] h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] ring-2 ring-slate-950 sm:right-[8px] sm:top-[8px]"
          aria-hidden
        />
      ) : null}
    </Link>
  );
}

export function SiteNav({
  isAuthenticated,
  avatarUrl,
  messengerUnreadInitial = 0,
}: {
  isAuthenticated: boolean;
  avatarUrl: string | null;
  messengerUnreadInitial?: number;
}) {
  const { lang, setLang, strings } = useLanguage();

  return (
    <header className="sticky top-0 z-[200] isolate touch-manipulation border-b border-white/10 bg-slate-950/70 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 md:flex-row md:items-center md:justify-between md:gap-4 md:px-6 md:py-4">
        <Link
          href="/"
          className="hidden min-h-11 min-w-0 shrink-0 touch-manipulation items-center md:flex md:min-h-10"
        >
          <span className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight text-white">
            Vennode
          </span>
        </Link>

        {/* Mobile: centered brand */}
        <div className="flex justify-center border-b border-white/10 py-2.5 md:hidden">
          <Link href="/" className="touch-manipulation py-1">
            <span className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight text-white">
              Vennode
            </span>
          </Link>
        </div>

        <nav
          className={cn(
            // Mobile: left cluster (lang + explore + manage) vs right (messages + enter/profile); desktop: single row right-aligned
            "flex min-w-0 w-full flex-nowrap items-center justify-between gap-x-2 py-2.5 md:flex-1 md:justify-end md:gap-2 md:overflow-visible md:py-0",
          )}
        >
          <div className="flex min-w-0 flex-nowrap items-center gap-1 md:contents">
            <div
              className="flex shrink-0 touch-manipulation items-center rounded-full border border-white/10 bg-black/30 p-0.5 text-[11px] font-medium text-slate-300"
              role="group"
              aria-label={strings.nav.langToggle}
            >
              <button
                type="button"
                onClick={() => setLang("en")}
                className={cn(
                  "touch-manipulation min-h-10 min-w-[2.75rem] rounded-full px-3 py-2 transition-colors sm:min-h-0 sm:px-2.5 sm:py-1",
                  lang === "en" ? "bg-white/15 text-white shadow-sm" : "text-slate-400 hover:text-slate-200",
                )}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("zh")}
                className={cn(
                  "touch-manipulation min-h-10 min-w-[2.75rem] rounded-full px-3 py-2 transition-colors sm:min-h-0 sm:px-2.5 sm:py-1",
                  lang === "zh" ? "bg-white/15 text-white shadow-sm" : "text-slate-400 hover:text-slate-200",
                )}
              >
                繁
              </button>
            </div>
            <Link
              href="/square"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "touch-manipulation shrink-0 whitespace-nowrap min-h-11 px-3 text-slate-200 hover:bg-white/5 hover:text-white sm:min-h-8 sm:px-2.5",
              )}
            >
              {strings.nav.explore}
            </Link>
            {isAuthenticated ? (
              <Link
                href="/console"
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "touch-manipulation shrink-0 whitespace-nowrap min-h-11 px-3 text-slate-200 hover:bg-white/5 hover:text-white sm:min-h-8 sm:px-2.5",
                )}
              >
                {strings.nav.manage}
              </Link>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-nowrap items-center gap-1 md:contents">
            {isAuthenticated ? (
              <MessagesNavLink ariaLabel={strings.nav.messages} messengerUnreadInitial={messengerUnreadInitial} />
            ) : null}
            {!isAuthenticated ? (
              <Link
                href="/login?flow=enter"
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "galaxy-btn-glow touch-manipulation shrink-0 whitespace-nowrap min-h-11 border border-sky-400/35 bg-sky-500/15 px-4 text-sky-50 hover:bg-sky-500/25 sm:min-h-8 sm:px-2.5",
                )}
              >
                {strings.nav.enter}
              </Link>
            ) : (
              <Link
                href="/profile"
                aria-label={strings.profilePage.title}
                className={cn(
                  "flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.04] text-slate-300 transition-colors hover:border-white/25 hover:bg-white/[0.07] sm:h-9 sm:w-9",
                )}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="h-5 w-5 opacity-80" strokeWidth={1.75} aria-hidden />
                )}
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
