import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { ensureProfileCoreCompleteForAppUse } from "@/lib/ensure-profile-core";
import { isAdminEmail } from "@/lib/admin-emails";
import AdminDashboard from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user } = await getAuthContext();
  if (!user?.email || !isAdminEmail(user.email)) {
    redirect("/console");
  }

  await ensureProfileCoreCompleteForAppUse();

  return <AdminDashboard />;
}
