"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { meetupCopy } from "@/lib/meetup-copy";

export function Footer({ signedIn = false }: { signedIn?: boolean }) {
  const { lang, strings } = useLanguage();
  const F = strings.footer;
  const t = meetupCopy(lang);
  const pathname = usePathname();
  const publishHref = signedIn ? "/create" : "/login?flow=register&after=%2Fcreate";

  function openHomeType(event: React.MouseEvent, next: "one_to_one" | "group") {
    if (pathname !== "/") return;
    event.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set("type", next);
    window.history.pushState(null, "", `${url.pathname}${url.search}#home-listings`);
    window.dispatchEvent(new CustomEvent("vennode-type", { detail: next }));
    document.getElementById("home-listings")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (pathname.startsWith("/messages")) {
    return (
      <footer className="relative z-10 shrink-0 border-t border-[#2a2a2a] bg-[#1c1c1c] px-4 py-2 text-xs text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p>{F.copyright}</p>
          <p>{F.madeWith}</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative z-10 mt-auto px-3 pb-4 pt-8 sm:px-5 sm:pb-6">
      <div className="mx-auto max-w-6xl rounded-[28px] bg-[#1c1c1c] px-6 py-8 text-slate-300 sm:px-10 sm:py-10">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-2 text-white">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#ff5a5f] text-sm font-bold">V</span>
            <span className="text-[17px] font-semibold tracking-tight">
              Vennode. <span className="text-[#ff8a8e]">{t.footerMark}</span>
            </span>
          </Link>
          <Link href={publishHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-white hover:text-[#ffb4b6]">
            {F.publishCta} →
          </Link>
        </div>

        <div className="grid gap-8 py-8 sm:grid-cols-3">
          <nav aria-label={F.account}>
            <p className="text-sm font-semibold text-white">{F.account}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {signedIn ? (
                <>
                  <li>
                    <Link href="/portal" className="inline-flex min-h-11 items-center text-slate-400 hover:text-white">
                      {F.myPosts}
                    </Link>
                  </li>
                  <li>
                    <Link href="/messages" className="inline-flex min-h-11 items-center text-slate-400 hover:text-white">
                      {F.messages}
                    </Link>
                  </li>
                  <li>
                    <Link href="/portal/settings" className="inline-flex min-h-11 items-center text-slate-400 hover:text-white">
                      {F.settings}
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/login?after=%2F" className="inline-flex min-h-11 items-center text-slate-400 hover:text-white">
                      {F.login}
                    </Link>
                  </li>
                  <li>
                    <Link href={publishHref} className="inline-flex min-h-11 items-center text-slate-400 hover:text-white">
                      {F.register}
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="inline-flex min-h-11 items-center text-slate-400 hover:text-white">
                      {F.contact}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
          <nav aria-label={F.discover}>
            <p className="text-sm font-semibold text-white">{F.discover}</p>
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                <Link
                  href="/?type=one_to_one#home-listings"
                  className="inline-flex min-h-11 items-center text-slate-400 hover:text-white"
                  onClick={(event) => openHomeType(event, "one_to_one")}
                >
                  {F.oneToOne}
                </Link>
              </li>
              <li>
                <Link
                  href="/?type=group#home-listings"
                  className="inline-flex min-h-11 items-center text-slate-400 hover:text-white"
                  onClick={(event) => openHomeType(event, "group")}
                >
                  {F.groups}
                </Link>
              </li>
              <li>
                <Link href="/square" className="inline-flex min-h-11 items-center text-slate-400 hover:text-white">
                  {F.square}
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label={F.about}>
            <p className="text-sm font-semibold text-white">{F.about}</p>
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                <Link href="/privacy" className="inline-flex min-h-11 items-center text-slate-400 hover:text-white">
                  {F.privacy}
                </Link>
              </li>
              <li>
                <Link href="/policy" className="inline-flex min-h-11 items-center text-slate-400 hover:text-white">
                  {F.policy}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="inline-flex min-h-11 items-center text-slate-400 hover:text-white">
                  {F.contact}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{F.copyright}</p>
          <p className="text-slate-400">{F.madeWith}</p>
        </div>
      </div>
    </footer>
  );
}
