import Link from "next/link";

export function LegalDocument({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-slate-200 sm:px-6 sm:py-16">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-sky-400/90">Vennode</p>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-slate-500">Last updated: {updated}</p>
      <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-300 [&_a]:text-sky-400 [&_a:hover]:underline [&_h2]:mt-10 [&_h2]:scroll-mt-20 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_h2:first-child]:mt-0 [&_li]:mt-2 [&_p]:mt-4 [&_strong]:font-semibold [&_strong]:text-slate-100 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
      <p className="mt-12 border-t border-white/10 pt-8 text-xs text-slate-500">
        Questions?{" "}
        <Link href="/contact" className="text-sky-400 hover:underline">
          Contact support
        </Link>{" "}
        or visit{" "}
        <Link href="/" className="text-sky-400 hover:underline">
          vennode.com
        </Link>
        .
      </p>
    </main>
  );
}
