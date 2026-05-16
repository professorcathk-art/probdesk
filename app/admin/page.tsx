import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { isAdminEmail } from "@/lib/admin-emails";
import AdminDashboard from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user } = await getAuthContext();
  if (!user?.email || !isAdminEmail(user.email)) {
    redirect("/console");
  }
  return <AdminDashboard />;
}
