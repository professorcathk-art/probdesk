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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getMessengerUnreadThreadCount();
      if (cancelled) return;
      if (typeof res === "number") setUnread(res);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <Link
      href="/messages"
      aria-label={ariaLabel}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "relative inline-flex h-11 min-h-11 w-11 shrink-0 items-center justify-center px-0 text-slate-200 hover:bg-white/5 hover:text-white sm:h-9 sm:min-h-8 sm:w-9",
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
    <header className="sticky top-0 z-[200] isolate border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        <Link href="/" className="flex min-h-11 min-w-0 items-center sm:min-h-10">
          <span className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight text-white">
            Vennode
          </span>
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
                "min-h-9 min-w-[2.75rem] rounded-full px-3 py-2 transition-colors sm:min-h-0 sm:px-2.5 sm:py-1",
                lang === "en" ? "bg-white/15 text-white shadow-sm" : "text-slate-400 hover:text-slate-200",
              )}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("zh")}
              className={cn(
                "min-h-9 min-w-[2.75rem] rounded-full px-3 py-2 transition-colors sm:min-h-0 sm:px-2.5 sm:py-1",
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
              "min-h-11 px-3 text-slate-200 hover:bg-white/5 hover:text-white sm:min-h-8 sm:px-2.5",
            )}
          >
            {strings.nav.explore}
          </Link>
          {isAuthenticated ? (
            <MessagesNavLink ariaLabel={strings.nav.messages} messengerUnreadInitial={messengerUnreadInitial} />
          ) : null}
          {isAuthenticated ? (
            <Link
              href="/console"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "min-h-11 px-3 text-slate-200 hover:bg-white/5 hover:text-white sm:min-h-8 sm:px-2.5",
              )}
            >
              {strings.nav.manage}
            </Link>
          ) : null}
          {!isAuthenticated ? (
            <Link
              href="/login?flow=enter"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "galaxy-btn-glow min-h-11 border border-sky-400/35 bg-sky-500/15 px-4 text-sky-50 hover:bg-sky-500/25 sm:min-h-8 sm:px-2.5",
              )}
            >
              {strings.nav.enter}
            </Link>
          ) : (
            <Link
              href="/profile"
              aria-label={strings.profilePage.title}
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.04] text-slate-300 transition-colors hover:border-white/25 hover:bg-white/[0.07] sm:h-9 sm:w-9",
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
        </nav>
      </div>
    </header>
  );
}
