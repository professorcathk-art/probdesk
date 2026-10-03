"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  adminForceSystemMatchBetweenUsers,
  adminListProfilesDirectory,
  type AdminProfileCardRow,
} from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function filterRows(rows: AdminProfileCardRow[], q: string): AdminProfileCardRow[] {
  const t = q.trim().toLowerCase();
  if (!t) return rows;
  return rows.filter((r) => {
    const hay = [
      r.email ?? "",
      r.display_name ?? "",
      r.location ?? "",
      r.bio ?? "",
      r.primary_active_intent_text ?? "",
      r.user_id,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(t);
  });
}

export default function AdminProfilesConsole() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminProfileCardRow[]>([]);
  const [filter, setFilter] = useState("");
  const [userA, setUserA] = useState("");
  const [userB, setUserB] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let c = false;
    void (async () => {
      const res = await adminListProfilesDirectory();
      if (c) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setRows(res.rows);
      setError(null);
    })();
    return () => {
      c = true;
    };
  }, []);

  const filtered = useMemo(() => filterRows(rows, filter), [rows, filter]);

  async function forceByProfile() {
    if (!userA || !userB || userA === userB) return;
    setBusy(true);
    setError(null);
    const res = await adminForceSystemMatchBetweenUsers({ userAId: userA, userBId: userB });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setUserA("");
    setUserB("");
    const reload = await adminListProfilesDirectory();
    if (reload.ok) setRows(reload.rows);
  }

  return (
    <div className="relative min-h-screen bg-[#070b16] text-slate-50">
      <GalaxyBackdrop />
      <main className="relative z-[1] mx-auto flex max-w-7xl flex-col gap-10 px-6 py-16 md:py-20">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/90">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">Profiles &amp; quick match</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Review full member snapshots (profiles + onboarding + latest active intent). Force system match resolves each
            side&apos;s <span className="text-slate-200">latest active intent</span> automatically — requires both users
            to have one.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link href="/admin" className="text-sm text-sky-300/90 underline-offset-4 hover:underline">
              ← Manual matchmaking (intent view)
            </Link>
            <Link href="/admin/email-logs" className="text-sm text-amber-200/90 underline-offset-4 hover:underline">
              Daily digest email logs →
            </Link>
          </div>
        </header>

        {loading ? <p className="text-slate-400">Loading profiles…</p> : null}
        {error ? <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

        <Card className="border-white/10 bg-white/[0.035] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-slate-100">Force match by profile</CardTitle>
            <CardDescription>Pick member A/B (UUID → uses most recently updated active intent per user).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2 md:items-end">
              <div className="space-y-2">
                <Label className="text-slate-300">Member A</Label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100"
                  value={userA}
                  onChange={(e) => setUserA(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {filtered.map((r) => (
                    <option key={`a-${r.user_id}`} value={r.user_id}>
                      {(r.display_name ?? r.email ?? r.user_id).slice(0, 72)} ({r.user_id.slice(0, 8)}…)
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Member B</Label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100"
                  value={userB}
                  onChange={(e) => setUserB(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {filtered.map((r) => (
                    <option key={`b-${r.user_id}`} value={r.user_id}>
                      {(r.display_name ?? r.email ?? r.user_id).slice(0, 72)} ({r.user_id.slice(0, 8)}…)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              type="button"
              disabled={busy || !userA || !userB || userA === userB}
              className="w-full border border-amber-400/35 bg-amber-500/15 text-amber-50 hover:bg-amber-500/25 sm:w-auto"
              onClick={() => void forceByProfile()}
            >
              {busy ? "Creating…" : "Force system match"}
            </Button>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-lg font-semibold text-white">All profiles ({filtered.length} shown)</h2>
            <div className="max-w-md flex-1">
              <Label className="text-xs text-slate-500">Filter</Label>
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search email, name, intent, UUID…"
                className="mt-1 border-white/15 bg-black/35 text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((r) => (
              <Card key={r.user_id} className="overflow-hidden border-white/10 bg-black/25 backdrop-blur-xl">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                  {r.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote Supabase URLs
                    <img src={r.avatar_url} alt="" className="h-14 w-14 shrink-0 rounded-full border border-white/15 object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-[10px] text-slate-500">
                      –
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base text-white">{r.display_name ?? "(no display name)"}</CardTitle>
                    <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{r.email ?? "—"}</p>
                    <p className="mt-2 font-mono text-[11px] text-slate-600">{r.user_id}</p>
                  </div>
                  <Badge variant="outline" className="border-white/20 text-[10px] text-slate-300">
                    {r.onboarding_status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs">
                    <p>
                      <span className="text-slate-500">Signup · </span>
                      <span className="text-slate-200">{new Date(r.user_created_at).toLocaleString()}</span>
                    </p>
                    {r.gender ? (
                      <p>
                        <span className="text-slate-500">Gender · </span>
                        {r.gender}
                      </p>
                    ) : null}
                    {r.age_group ? (
                      <p>
                        <span className="text-slate-500">Age · </span>
                        {r.age_group}
                      </p>
                    ) : null}
                    {r.location ? (
                      <p>
                        <span className="text-slate-500">Location · </span>
                        {r.location}
                      </p>
                    ) : null}
                    {r.industry ? (
                      <p>
                        <span className="text-slate-500">Industry · </span>
                        {r.industry}
                      </p>
                    ) : null}
                    {r.superpower ? (
                      <p>
                        <span className="text-slate-500">Superpower · </span>
                        {r.superpower}
                      </p>
                    ) : null}
                    {r.bio ? (
                      <p className="whitespace-pre-wrap text-slate-200">
                        <span className="text-slate-500">Bio · </span>
                        {r.bio}
                      </p>
                    ) : (
                      <p className="text-slate-500">Bio · —</p>
                    )}
                  </div>
                  <div className="text-xs">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Latest active intent</p>
                    {r.primary_active_intent_id ? (
                      <div className="mt-2 space-y-1 rounded-lg border border-sky-500/20 bg-sky-500/10 p-2">
                        <p className="font-mono text-[10px] text-sky-200/70">{r.primary_active_intent_id}</p>
                        <p className="text-slate-100">{r.primary_active_intent_text ?? "—"}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-amber-200/70">None — cannot pair this side until user has an active intent.</p>
                    )}
                  </div>
                  {(r.skills_tags?.length ?? 0) > 0 ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Skills / interests</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(r.skills_tags ?? []).map((tag) => (
                          <Badge key={tag} variant="secondary" className="rounded-md bg-white/[0.08] text-[11px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {(r.languages?.length ?? 0) > 0 ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Languages</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(r.languages ?? []).map((tag) => (
                          <Badge key={tag} variant="outline" className="border-white/14 text-[11px] text-slate-200">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-slate-400">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Social & contact</p>
                    {r.social_link ? (
                      <p className="mt-2 break-all text-sky-300">{r.social_link}</p>
                    ) : (
                      <p className="mt-2 text-slate-600">Social · —</p>
                    )}
                    {r.preferred_contact_channel ? (
                      <p className="mt-2 text-slate-200">
                        {r.preferred_contact_channel} · {r.preferred_contact_detail ?? ""}
                      </p>
                    ) : (
                      <p className="mt-2 text-slate-600">Preferred channel · —</p>
                    )}
                  </div>
                  <div className="text-xs">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Album uploads</p>
                    <p className="mt-2 text-slate-200">
                      {r.album_storage_paths.length === 0
                        ? "No photos uploaded."
                        : `${r.album_storage_paths.length} object(s) in profile-album storage`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
