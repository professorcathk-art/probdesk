import { redirect } from "next/navigation";
import { listMatches } from "@/actions/matches";
import { listMyIntents } from "@/actions/intents";
import { getAuthContext } from "@/lib/auth-context";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const { user, onboardingStatus } = await getAuthContext();

  if (!user) {
    redirect("/login");
  }

  if (onboardingStatus !== "complete") {
    redirect("/onboarding");
  }

  const intentsRes = await listMyIntents();
  const matchesRes = await listMatches();

  const intents = "error" in intentsRes ? [] : intentsRes.intents;
  const matches = "error" in matchesRes ? [] : matchesRes.matches;

  return <DashboardClient userId={user.id} intents={intents} matches={matches} />;
}
