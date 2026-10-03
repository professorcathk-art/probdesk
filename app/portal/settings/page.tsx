import { redirect } from "next/navigation";
import { getMyProfileIdentity } from "@/actions/profile";
import { SettingsScreen } from "@/components/meetup/settings-screen";
import { getAuthContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function PortalSettingsPage() {
  const { user } = await getAuthContext();
  if (!user) redirect("/login?after=%2Fportal%2Fsettings");
  const identity = await getMyProfileIdentity();
  if ("error" in identity) redirect("/login?after=%2Fportal%2Fsettings");
  return <SettingsScreen identity={identity} />;
}
