"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  adminForceSystemMatch,
  adminListDirectory,
  adminListMatchTracker,
  adminListPairingScoreLogs,
  type AdminIntentRow,
  type AdminMatchTrackerRow,
  type AdminPairingScoreRow,
} from "@/actions/admin";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

function PairingMetaCell({ meta }: { meta: Record<string, unknown> }) {
  let full: string;
  try {
    full = JSON.stringify(meta, null, 2);
  } catch {
    full = "—";
  }
  return (
    <details className="max-w-[min(420px,85vw)]">
      <summary className="cursor-pointer select-none font-mono text-[10px] text-sky-400 hover:underline">
        Meta ({full.length.toLocaleString()} chars)
      </summary>
      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-white/10 bg-black/50 p-2 text-[10px] leading-relaxed text-slate-300">
        {full}
      </pre>
    </details>
  );
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intents, setIntents] = useState<AdminIntentRow[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [tracker, setTracker] = useState<AdminMatchTrackerRow[]>([]);
  const [pairingLogs, setPairingLogs] = useState<AdminPairingScoreRow[]>([]);
  const [pairingLogsErr, setPairingLogsErr] = useState<string | null>(null);
  const [selA, setSelA] = useState<string>("");
  const [selB, setSelB] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [dir, trk, logs] = await Promise.all([
        adminListDirectory(),
        adminListMatchTracker(),
        adminListPairingScoreLogs(),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (!dir.ok) {
        setError(dir.message);
        return;
      }
      if (!trk.ok) {
        setError(trk.message);
        setIntents(dir.intents);
        setUserCount(dir.users.length);
        setPairingLogsErr(logs.ok ? null : logs.message);
        if (logs.ok) setPairingLogs(logs.rows);
        return;
      }
      setIntents(dir.intents);
      setUserCount(dir.users.length);
      setTracker(trk.matches);
      setPairingLogsErr(logs.ok ? null : logs.message);
      if (logs.ok) setPairingLogs(logs.rows);
      setError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function forceMatch() {
    if (!selA || !selB) return;
    setBusy(true);
    setError(null);
    const res = await adminForceSystemMatch({ intentAId: selA, intentBId: selB });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setSelA("");
    setSelB("");
    const [trk, logs] = await Promise.all([adminListMatchTracker(), adminListPairingScoreLogs()]);
    if (trk.ok) setTracker(trk.matches);
    if (logs.ok) setPairingLogs(logs.rows);
  }

  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 md:py-20">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/90">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">Manual matchmaking</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Cold-start tool: pair two active intents into a <span className="text-slate-200">Pending_System</span> match.
            Both users must accept in Console.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link href="/console" className="inline-block text-sm text-sky-300/90 underline-offset-4 hover:underline">
              ← Back to console
            </Link>
            <Link href="/admin/email-logs" className="inline-block text-sm text-amber-200/90 underline-offset-4 hover:underline">
              Daily digest email logs →
            </Link>
          </div>
        </header>

        {loading ? <p className="text-slate-400">Loading directory…</p> : null}
        {error ? <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

        <Card className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-slate-100">Force system match</CardTitle>
            <CardDescription>Select two different users&apos; active intents.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label className="text-slate-300">Intent A</Label>
              <select
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100"
                value={selA}
                onChange={(e) => setSelA(e.target.value)}
              >
                <option value="">Choose…</option>
                {intents.map((i) => (
                  <option key={i.id} value={i.id}>
                    {(i.natural_language_input ?? "").slice(0, 72)}… ({i.user_id.slice(0, 8)}…)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-slate-300">Intent B</Label>
              <select
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100"
                value={selB}
                onChange={(e) => setSelB(e.target.value)}
              >
                <option value="">Choose…</option>
                {intents.map((i) => (
                  <option key={`b-${i.id}`} value={i.id}>
                    {(i.natural_language_input ?? "").slice(0, 72)}… ({i.user_id.slice(0, 8)}…)
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              disabled={busy || !selA || !selB || selA === selB}
              className="galaxy-btn-glow border border-amber-400/35 bg-amber-500/15 text-amber-50 hover:bg-amber-500/25"
              onClick={() => void forceMatch()}
            >
              {busy ? "Creating…" : "Force system match"}
            </Button>
          </CardContent>
        </Card>

        <section>
          <h2 className="text-lg font-semibold text-white">
            Active intents ({intents.length}) · Users ({userCount})
          </h2>
          <p className="mt-1 text-xs text-slate-500">Profile context helps you judge fit before forcing a system match.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {intents.map((i) => (
              <div key={i.id} className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm">
                <p className="font-mono text-[11px] text-slate-500">{i.id}</p>
                <p className="mt-2 text-slate-200">{i.natural_language_input}</p>
                <div className="mt-3 space-y-1 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs text-slate-400">
                  <p>
                    <span className="text-slate-500">Profile · </span>
                    {i.profile_display_name ?? "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">Location · </span>
                    {i.profile_location ?? i.location_filter ?? "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">Industry · </span>
                    {i.profile_industry ?? "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">Superpower · </span>
                    {i.profile_superpower ?? "—"}
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  User {i.user_id} · Intent location {i.location_filter ?? "none"} · Square: {i.is_marketplace_public ? "yes" : "no"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Match status tracker</h2>
          <p className="text-xs text-slate-500">Follow manual introductions and outcomes across the fleet.</p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="border-b border-white/10 bg-black/30 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">User A</th>
                  <th className="px-3 py-2 font-medium">User B</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {tracker.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      No matches yet.
                    </td>
                  </tr>
                ) : (
                  tracker.map((m) => (
                    <tr key={m.id} className="border-b border-white/5 text-slate-300">
                      <td className="max-w-[200px] truncate px-3 py-2 align-top text-xs">
                        {m.sender_email ?? m.sender_id}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2 align-top text-xs">
                        {m.receiver_email ?? m.receiver_id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-top text-xs">{m.match_type}</td>
                      <td className="whitespace-nowrap px-3 py-2 align-top text-xs font-medium text-slate-200">{m.status}</td>
                      <td className="whitespace-nowrap px-3 py-2 align-top text-xs text-slate-500">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Pairing score log</h2>
          <p className="text-xs text-slate-500">
            Recent hybrid suggestion, invite vibe, and admin system-match scoring events (service role). Apply migration 059 if this table is missing.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[960px] border-collapse text-left text-xs">
              <thead className="border-b border-white/10 bg-black/30 uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">Time</th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">Source</th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">Anchor intent</th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">Candidate intent</th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">Score</th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">Sim</th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">RPC θ</th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">Rank</th>
                  <th className="whitespace-nowrap px-2 py-2 font-medium">Top?</th>
                  <th className="min-w-[120px] px-2 py-2 font-medium">Excluded</th>
                  <th className="min-w-[140px] px-2 py-2 font-medium">Compat note</th>
                  <th className="min-w-[160px] px-2 py-2 font-medium">Meta</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {pairingLogs.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-6 text-center text-slate-500">
                      {pairingLogsErr ?? "No pairing score events yet."}
                    </td>
                  </tr>
                ) : (
                  pairingLogs.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 align-top">
                      <td className="whitespace-nowrap px-2 py-2 text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-2 py-2 font-mono text-[11px] text-slate-400">{r.source}</td>
                      <td className="max-w-[100px] truncate px-2 py-2 font-mono text-[11px]" title={r.anchor_intent_id ?? ""}>
                        {r.anchor_intent_id ?? "—"}
                      </td>
                      <td className="max-w-[100px] truncate px-2 py-2 font-mono text-[11px]" title={r.candidate_intent_id ?? ""}>
                        {r.candidate_intent_id ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">{r.match_score ?? "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">{r.similarity ?? "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums">{r.rpc_threshold ?? "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2">{r.rank_after_sort ?? "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2">{r.selected_top == null ? "—" : r.selected_top ? "yes" : "no"}</td>
                      <td className="max-w-[140px] break-words px-2 py-2 text-slate-400">{r.excluded_reason ?? "—"}</td>
                      <td className="max-w-[160px] break-words px-2 py-2 text-slate-400">{r.compatibility_reason ?? "—"}</td>
                      <td className="max-w-[160px] px-2 py-2 align-top text-slate-400">
                        <PairingMetaCell meta={r.meta} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
