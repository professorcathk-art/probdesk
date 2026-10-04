"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, MessageCircle, Sparkles, UserRound, X } from "lucide-react";
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
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onSearch = (event: Event) => setQuery((event as CustomEvent<string>).detail ?? "");
    window.addEventListener("vennode-search", onSearch);
    return () => window.removeEventListener("vennode-search", onSearch);
  }, []);

  function openHomeType(event: React.MouseEvent, next: "one_to_one" | "group") {
    if (pathname !== "/") return;
    event.preventDefault();
    setOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.set("type", next);
    window.history.pushState(null, "", `${url.pathname}${url.search}`);
    window.dispatchEvent(new CustomEvent("vennode-type", { detail: next }));
  }

  function onSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    setOpen(false);
    if (pathname === "/") {
      const url = new URL(window.location.href);
      if (q) url.searchParams.set("q", q);
      else url.searchParams.delete("q");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
      window.dispatchEvent(new CustomEvent("vennode-search", { detail: q }));
      return;
    }
    router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
  }

  return (
    <>
    <header className="sticky top-0 z-[200] border-b border-[#eee] bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-[#222]">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#ff5a5f] text-sm font-bold text-white">V</span>
          <span className="text-[17px] font-semibold tracking-tight">Vennode</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
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
    </header>
    <section className="bg-[#f8fafc]">
      <form onSubmit={onSearch} className="mx-auto w-full max-w-3xl px-4 pb-2 pt-5 sm:px-6" role="search">
        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#ff5a5f]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t.searchLabel}
          </span>
          <input
            value={query}
            aria-label={t.searchLabel}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              if (pathname !== "/" || event.target !== document.activeElement) return;
              const q = next.trim();
              const url = new URL(window.location.href);
              if (q) url.searchParams.set("q", q);
              else url.searchParams.delete("q");
              window.history.replaceState(null, "", `${url.pathname}${url.search}`);
              window.dispatchEvent(new CustomEvent("vennode-search", { detail: q }));
            }}
            placeholder={t.searchPlaceholder}
            className="h-12 w-full rounded-full border border-rose-100 bg-white px-5 text-base text-[#222] shadow-sm outline-none placeholder:text-[#9a9a9a] focus:border-[#ff5a5f] focus:ring-4 focus:ring-[#ff5a5f]/15"
          />
          <span className="mt-1 block px-2 text-xs text-slate-500">{t.searchHint}</span>
        </label>
      </form>
    </section>
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
                <Link href="/?type=one_to_one" prefetch={false} className="min-h-11 py-2 text-sm font-medium text-slate-900" onClick={(event) => openHomeType(event, "one_to_one")}>
                  {t.oneToOne}
                </Link>
                <Link href="/?type=group" prefetch={false} className="min-h-11 py-2 text-sm font-medium text-slate-900" onClick={(event) => openHomeType(event, "group")}>
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
    </>
  );
}
