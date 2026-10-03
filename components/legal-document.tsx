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
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-12 text-[#333] sm:px-6 sm:py-16">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#ff5b1f]">Vennode</p>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[#222] sm:text-3xl md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-slate-500">Last updated: {updated}</p>
      <div className="mt-10 space-y-8 text-sm leading-relaxed text-[#444] [&_a]:text-[#ff5b1f] [&_a:hover]:underline [&_h2]:mt-10 [&_h2]:scroll-mt-20 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[#222] [&_h2:first-child]:mt-0 [&_li]:mt-2 [&_p]:mt-4 [&_strong]:font-semibold [&_strong]:text-[#222] [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
      <p className="mt-12 border-t border-[#eee] pt-8 text-xs text-[#757575]">
        Questions?{" "}
        <Link href="/contact" className="text-[#ff5b1f] hover:underline">
          Contact support
        </Link>{" "}
        or visit{" "}
        <Link href="/" className="text-[#ff5b1f] hover:underline">
          vennode.com
        </Link>
        .
      </p>
    </main>
  );
}
