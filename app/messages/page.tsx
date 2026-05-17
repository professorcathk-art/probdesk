import { redirect } from "next/navigation";
import { listMessengerThreads, resolveMessengerPeerFromMatch } from "@/actions/messenger";
import { GalaxyBackdrop } from "@/components/galaxy-backdrop";
import { MessagesPageClient } from "@/components/messages-page-client";
import { getAuthContext } from "@/lib/auth-context";
import { ensureProfileCoreCompleteForAppUse } from "@/lib/ensure-profile-core";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ matchId?: string }>;
}) {
  const { user, onboardingStatus } = await getAuthContext();
  if (!user) redirect("/login");
  if (onboardingStatus !== "complete") redirect("/onboarding");

  await ensureProfileCoreCompleteForAppUse();

  const sp = (await searchParams) ?? {};
  const matchIdRaw = typeof sp.matchId === "string" ? sp.matchId.trim() : "";

  const threadsRes = await listMessengerThreads();
  const threads = "error" in threadsRes ? [] : threadsRes.threads;

  let initialPeerId: string | null = null;
  let matchParamInvalid = false;

  if (matchIdRaw && /^[0-9a-f-]{36}$/i.test(matchIdRaw)) {
    const resolved = await resolveMessengerPeerFromMatch(matchIdRaw);
    if (resolved.ok) {
      initialPeerId = resolved.peerId;
    } else {
      matchParamInvalid = true;
    }
  }

  return (
    <div className="relative min-h-screen text-slate-50">
      <GalaxyBackdrop />
      <main className="relative mx-auto flex max-w-6xl flex-col px-4 py-8 sm:px-6 md:py-10">
        <MessagesPageClient
          key={`${matchIdRaw}:${initialPeerId ?? ""}:${matchParamInvalid}`}
          userId={user.id}
          threads={threads}
          initialPeerId={initialPeerId}
          matchParamInvalid={matchParamInvalid}
        />
      </main>
    </div>
  );
}
