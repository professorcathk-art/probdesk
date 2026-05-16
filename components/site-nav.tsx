import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function SiteNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.85)]" />
          <span className="text-sm font-semibold tracking-[0.22em] text-slate-100">PROBDESK</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/marketplace"
            className={cn(buttonVariants({ variant: "ghost" }), "text-slate-200 hover:bg-white/5 hover:text-white")}
          >
            Square
          </Link>
          <Link
            href="/console"
            className={cn(buttonVariants({ variant: "ghost" }), "text-slate-200 hover:bg-white/5 hover:text-white")}
          >
            Console
          </Link>
          {!isAuthenticated ? (
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "default" }),
                "galaxy-btn-glow border border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25",
              )}
            >
              Enter
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
