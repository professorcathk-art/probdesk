import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-black/40 px-6 py-10 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
          <Link href="#" className="hover:text-slate-200">
            Privacy Policy
          </Link>
          <Link href="#" className="hover:text-slate-200">
            Terms of Service
          </Link>
          <Link href="#" className="hover:text-slate-200">
            Contact
          </Link>
        </nav>
        <p className="text-sm text-slate-500">© 2026 Probdesk</p>
      </div>
    </footer>
  );
}
