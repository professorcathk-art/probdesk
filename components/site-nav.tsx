"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { signOut } from "@/actions/auth";
import { useLanguage } from "@/components/language-provider";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function SiteNav({
  isAuthenticated,
  avatarUrl,
}: {
  isAuthenticated: boolean;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const { lang, setLang, strings } = useLanguage();

  async function onSignOut() {
    await signOut();
    router.replace("/");
  }

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
            {strings.nav.explore}
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
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={strings.nav.accountMenu}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.04] text-slate-300 transition-colors hover:border-white/25 hover:bg-white/[0.07]",
                )}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="h-5 w-5 opacity-80" strokeWidth={1.75} aria-hidden />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLinkItem href="/console">{strings.nav.manage}</DropdownMenuLinkItem>
                <DropdownMenuLinkItem href="/profile">{strings.nav.profile}</DropdownMenuLinkItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-slate-300"
                  onClick={() => {
                    void onSignOut();
                  }}
                >
                  {strings.nav.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  );
}
