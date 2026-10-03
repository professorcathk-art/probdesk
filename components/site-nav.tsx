"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, MessageCircle, Search, UserRound, X } from "lucide-react";
import { getMessengerUnreadThreadCount } from "@/actions/messenger";
import { signOut } from "@/actions/auth";
import { useLanguage } from "@/components/language-provider";
import { meetupCopy } from "@/lib/meetup-copy";

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
    <Link href="/messages" aria-label={label} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#222] hover:bg-[#f4f4f4]">
      <MessageCircle className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      {unread > 0 ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ff5a5f]" aria-hidden /> : null}
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
    <header className="sticky top-0 z-[200] border-b border-[#eee] bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-[#222]">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#ff5a5f] text-sm font-bold text-white">V</span>
          <span className="text-[17px] font-semibold tracking-tight">Vennode</span>
        </Link>
        <form onSubmit={onSearch} className="mx-auto hidden min-w-0 max-w-md flex-1 md:block" role="search">
          <label className="relative block">
            <span className="sr-only">{t.searchLabel}</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="h-11 w-full rounded-full bg-[#f3f3f3] pl-10 pr-4 text-sm text-[#222] outline-none placeholder:text-[#9a9a9a] focus:bg-white focus:ring-2 focus:ring-[#ff5a5f]/30"
            />
          </label>
        </form>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <button type="button" onClick={() => setLang(lang === "zh" ? "en" : "zh")} className="hidden h-10 px-2 text-xs font-semibold text-[#555] sm:inline-flex">
            {lang === "zh" ? "EN" : "繁"}
          </button>
          {isAuthenticated ? (
            <Link href="/create" className="inline-flex h-10 items-center rounded-lg bg-[#ff5a5f] px-3.5 text-sm font-semibold text-white hover:bg-[#e0484d]">
              {t.publish}
            </Link>
          ) : (
            <>
              <Link href="/login?after=%2F" className="inline-flex h-10 items-center px-2 text-sm font-semibold text-[#222]">
                {t.login}
              </Link>
              <Link href="/login?flow=register&after=%2Fcreate" className="inline-flex h-10 items-center rounded-lg bg-[#ff5a5f] px-3.5 text-sm font-semibold text-white hover:bg-[#e0484d]">
                {t.register}
              </Link>
            </>
          )}
          {isAuthenticated ? <MessagesNavLink unreadInitial={messengerUnreadInitial} label={t.messages} /> : null}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#222] hover:bg-[#f4f4f4]"
            aria-expanded={open}
            aria-label={t.menu}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden />
            ) : isAuthenticated && avatarUrl ? (
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
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
            className="h-11 w-full rounded-full bg-[#f3f3f3] pl-10 pr-4 text-sm outline-none"
          />
        </label>
      </form>
      {open ? (
        <div className="fixed inset-0 z-[180]">
          <button type="button" className="absolute inset-0 bg-slate-900/30" aria-label={t.menu} onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col bg-white px-5 py-6 shadow-2xl" aria-label={t.menu}>
          <div className="flex flex-col pt-10">
            <p className="text-lg font-semibold text-slate-900">Vennode</p>
            <button type="button" onClick={() => setLang(lang === "zh" ? "en" : "zh")} className="mt-4 min-h-11 text-left text-sm font-medium text-slate-700">
              {lang === "zh" ? "English" : "繁體中文"}
            </button>
            {!isAuthenticated ? (
              <>
                <Link href="/?type=one_to_one" className="min-h-11 py-2 text-sm font-medium text-slate-900" onClick={() => setOpen(false)}>
                  {t.oneToOne}
                </Link>
                <Link href="/?type=group" className="min-h-11 py-2 text-sm font-medium text-slate-900" onClick={() => setOpen(false)}>
                  {t.groups}
                </Link>
                <Link href="/square" className="min-h-11 py-2 text-sm font-medium text-slate-900" onClick={() => setOpen(false)}>
                  {t.explore}
                </Link>
                <Link href="/login?after=%2F" className="min-h-11 py-2 text-sm font-medium text-slate-900" onClick={() => setOpen(false)}>
                  {t.login}
                </Link>
                <Link href="/login?flow=register&after=%2Fcreate" className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-[#ff5a5f] text-sm font-semibold text-white" onClick={() => setOpen(false)}>
                  {t.register}
                </Link>
              </>
            ) : null}
            {isAuthenticated ? (
              <>
                <Link href="/portal/one-to-one" className="min-h-11 py-2 text-sm font-medium text-[#222]" onClick={() => setOpen(false)}>
                  {t.oneToOne}
                </Link>
                <Link href="/portal/groups" className="min-h-11 py-2 text-sm font-medium text-[#222]" onClick={() => setOpen(false)}>
                  {t.groups}
                </Link>
                <Link href="/portal/settings" className="min-h-11 py-2 text-sm font-medium text-[#222]" onClick={() => setOpen(false)}>
                  {t.settings}
                </Link>
                <Link href="/messages" className="min-h-11 py-2 text-sm font-medium text-[#222]" onClick={() => setOpen(false)}>
                  {t.messages}
                </Link>
                <Link href="/console" className="min-h-11 py-2 text-sm text-[#757575]" onClick={() => setOpen(false)}>
                  {t.advanced}
                </Link>
                <button
                  type="button"
                  className="min-h-11 py-2 text-left text-sm font-medium text-[#222]"
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
        </div>
      ) : null}
    </header>
  );
}
