import { redirect } from "next/navigation";
import { listMyAiRecommendations } from "@/actions/ai-recommendations";
import { listMyIntents } from "@/actions/intents";
import { listMatches } from "@/actions/matches";
import { PortalBoard } from "@/components/meetup/portal-board";
import { getAuthContext } from "@/lib/auth-context";
import { ensureProfileCoreCompleteForAppUse } from "@/lib/ensure-profile-core";

export const dynamic = "force-dynamic";

export default async function GroupsPortalPage() {
  const { user } = await getAuthContext();
  if (!user) redirect("/login?after=%2Fportal%2Fgroups");
  await ensureProfileCoreCompleteForAppUse();
  const [intentsRes, matchesRes, suggestionsRes] = await Promise.all([listMyIntents(), listMatches(), listMyAiRecommendations()]);
  const intents = "error" in intentsRes ? [] : intentsRes.intents;
  const matches = "error" in matchesRes ? [] : matchesRes.matches;
  const suggestions = suggestionsRes.ok ? suggestionsRes.rows : [];
  return <PortalBoard kind="group" userId={user.id} intents={intents} matches={matches} suggestions={suggestions} />;
}
