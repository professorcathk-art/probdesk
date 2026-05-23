import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAuthContext } from "@/lib/auth-context";
import { ensureProfileCoreCompleteForAppUse } from "@/lib/ensure-profile-core";
import { isAdminEmail } from "@/lib/admin-emails";

export const dynamic = "force-dynamic";

/**
 * Guards every `/admin/*` route: only emails in {@link isAdminEmail} may access.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await getAuthContext();
  if (!user?.email || !isAdminEmail(user.email)) {
    redirect("/console");
  }
  await ensureProfileCoreCompleteForAppUse();
  return <>{children}</>;
}
