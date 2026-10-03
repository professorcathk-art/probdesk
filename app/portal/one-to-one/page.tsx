import { redirect } from "next/navigation";
import { listIntentKinds, listMyIntents } from "@/actions/intents";
import { listMatches } from "@/actions/matches";
import { PortalBoard } from "@/components/meetup/portal-board";
import { getAuthContext } from "@/lib/auth-context";
import { ensureProfileCoreCompleteForAppUse } from "@/lib/ensure-profile-core";

export const dynamic = "force-dynamic";

export default async function OneToOnePortalPage() {
  const { user } = await getAuthContext();
  if (!user) redirect("/login?after=%2Fportal%2Fone-to-one");
  await ensureProfileCoreCompleteForAppUse();
  const [intentsRes, matchesRes] = await Promise.all([listMyIntents(), listMatches()]);
  const intents = "error" in intentsRes ? [] : intentsRes.intents;
  const matches = "error" in matchesRes ? [] : matchesRes.matches;
  const kindByIntentId = await listIntentKinds(
    matches.flatMap((row) => [row.intent_request_id, row.counterparty_intent_id, row.sender_context_intent_id].filter((id): id is string => Boolean(id))),
  );
  return <PortalBoard kind="one_to_one" userId={user.id} intents={intents} matches={matches} kindByIntentId={kindByIntentId} />;
}
