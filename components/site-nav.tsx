"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, MessageCircle, Search, UserRound } from "lucide-react";
import { getMessengerUnreadThreadCount } from "@/actions/messenger";
import { signOut } from "@/actions/auth";
import { useLanguage } from "@/components/language-provider";
import { meetupCopy } from "@/lib/meetup-copy";
import { cn } from "@/lib/utils";

function MessagesNavLink({ unreadInitial, label }: { unreadInitial: number; label: string }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(unreadInitial);

  useEffect(() => {
    const timer = window.setTimeout(() => setUnread(unreadInitial), 0);
    return () => window.clearTimeout(timer);
  }, [unreadInitial]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const res = await getMessengerUnreadThreadCount();
        if (cancelled) return;
        if (typeof res === "number") setUnread(res);
      })();
    }, 550);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <Link
      href="/messages"
      aria-label={label}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-700 hover:bg-violet-50"
    >
      <MessageCircle className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      {unread > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" aria-hidden /> : null}
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
  const { lang, setLang } = useLanguage();
  const t = meetupCopy(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function onSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-[200] border-b border-violet-100 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-6">
        <Link href="/" className="shrink-0 text-base font-semibold tracking-tight text-slate-900">
          Vennode
        </Link>
        <form onSubmit={onSearch} className="ml-auto hidden min-w-0 max-w-xs flex-1 md:flex" role="search">
          <label className="relative block w-full">
            <span className="sr-only">{t.searchLabel}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="h-11 w-full rounded-full border border-violet-100 bg-violet-50/60 pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-300"
            />
          </label>
        </form>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <div className="flex items-center rounded-full border border-violet-100 p-0.5 text-[11px] font-medium" role="group" aria-label={lang === "zh" ? "語言" : "Language"}>
            <button type="button" onClick={() => setLang("en")} className={cn("min-h-10 rounded-full px-2.5", lang === "en" ? "bg-violet-600 text-white" : "text-slate-500")}>
              EN
            </button>
            <button type="button" onClick={() => setLang("zh")} className={cn("min-h-10 rounded-full px-2.5", lang === "zh" ? "bg-violet-600 text-white" : "text-slate-500")}>
              繁
            </button>
          </div>
          {isAuthenticated ? (
            <Link href="/create" className="inline-flex min-h-11 items-center rounded-full bg-violet-600 px-3 text-sm font-medium text-white hover:bg-violet-700">
              {t.publish}
            </Link>
          ) : (
            <>
              <Link href="/login?after=%2F" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-slate-700">
                {t.login}
              </Link>
              <Link href="/login?flow=register&after=%2Fcreate" className="inline-flex min-h-11 items-center rounded-full bg-violet-600 px-3 text-sm font-medium text-white">
                {t.register}
              </Link>
            </>
          )}
          {isAuthenticated ? <MessagesNavLink unreadInitial={messengerUnreadInitial} label={t.messages} /> : null}
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-700 hover:bg-violet-50"
            aria-expanded={open}
            aria-label={t.menu}
            onClick={() => setOpen((value) => !value)}
          >
            {isAuthenticated && avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL
              <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : isAuthenticated ? (
              <UserRound className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>
      <form onSubmit={onSearch} className="mx-auto w-full max-w-6xl px-4 pb-3 md:hidden" role="search">
        <label className="relative block">
          <span className="sr-only">{t.searchLabel}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
            className="h-11 w-full rounded-full border border-violet-100 bg-violet-50/60 pl-9 pr-3 text-sm outline-none"
          />
        </label>
      </form>
      {open ? (
        <nav className="border-t border-violet-100 bg-white px-4 py-2 sm:px-6" aria-label={t.menu}>
          <div className="mx-auto flex max-w-6xl flex-col">
            <Link href="/square" className="min-h-11 py-2 text-sm text-slate-800" onClick={() => setOpen(false)}>
              {t.explore}
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/portal/one-to-one" className="min-h-11 py-2 text-sm text-slate-800" onClick={() => setOpen(false)}>
                  {t.oneToOne}
                </Link>
                <Link href="/portal/groups" className="min-h-11 py-2 text-sm text-slate-800" onClick={() => setOpen(false)}>
                  {t.groups}
                </Link>
                <Link href="/portal/settings" className="min-h-11 py-2 text-sm text-slate-800" onClick={() => setOpen(false)}>
                  {t.settings}
                </Link>
                <Link href="/messages" className="min-h-11 py-2 text-sm text-slate-800" onClick={() => setOpen(false)}>
                  {t.messages}
                </Link>
                <Link href="/console" className="min-h-11 py-2 text-sm text-slate-500" onClick={() => setOpen(false)}>
                  {t.advanced}
                </Link>
                <button
                  type="button"
                  className="min-h-11 py-2 text-left text-sm text-slate-800"
                  onClick={() => {
                    void signOut().then(() => {
                      setOpen(false);
                      router.replace("/");
                      router.refresh();
                    });
                  }}
                >
                  {t.signOut}
                </button>
              </>
            ) : null}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
