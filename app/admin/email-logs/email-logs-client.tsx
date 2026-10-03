"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminListEmailLogs, type AdminEmailLogRow } from "@/actions/ai-recommendations";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmailLogsClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminEmailLogRow[]>([]);
  const [unsent, setUnsent] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await adminListEmailLogs();
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setRows(res.rows);
      setUnsent(res.unsentRecommendationCount);
      setError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function reload() {
    setLoading(true);
    const res = await adminListEmailLogs();
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setRows(res.rows);
    setUnsent(res.unsentRecommendationCount);
    setError(null);
  }

  return (
    <div className="relative min-h-screen bg-[#070b16] text-slate-50">
      <GalaxyBackdrop />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 md:py-20">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/90">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">Daily digest email logs</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Cron route <code className="rounded bg-black/40 px-1.5 py-0.5 text-sky-200">/api/cron/daily-digest</code> —
              notifies intent owners via Resend (default <span className="text-slate-300">onboarding@resend.dev</span> +{" "}
              <span className="text-slate-300">RESEND_API_KEY</span>) when queued{" "}
              <span className="text-slate-300">ai_recommendations</span> emails are pending.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="border-white/15 text-slate-200" onClick={() => void reload()}>
              Refresh
            </Button>
            <Link
              href="/admin/profiles"
              className="inline-flex h-10 items-center rounded-md border border-white/15 px-4 text-sm text-slate-200 hover:bg-white/5"
            >
              Profiles directory
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-10 items-center rounded-md border border-white/15 px-4 text-sm text-slate-200 hover:bg-white/5"
            >
              ← Admin home
            </Link>
          </div>
        </header>

        <Card className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-slate-100">Recommendation queue</CardTitle>
            <CardDescription>
              Unsent, non-dismissed rows in <span className="text-slate-300">ai_recommendations</span> awaiting digest email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums text-sky-300">{loading ? "…" : unsent}</p>
          </CardContent>
        </Card>

        {error ? <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

        <Card className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-slate-100">Run history</CardTitle>
            <CardDescription>Latest 200 entries from admin_email_logs.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? <p className="text-slate-400">Loading…</p> : null}
            {!loading && rows.length === 0 ? <p className="text-slate-500">No runs logged yet.</p> : null}
            {rows.length > 0 ? (
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2 pr-4 font-medium">Date (UTC)</th>
                    <th className="py-2 pr-4 font-medium">Digest emails sent</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 text-slate-200">
                      <td className="py-2 pr-4 tabular-nums text-slate-300">{r.run_date}</td>
                      <td className="py-2 pr-4 tabular-nums">{r.total_emails_sent}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            r.status === "success" ? "text-emerald-400" : "text-red-400"
                          }
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 text-slate-500">{r.error_message ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
