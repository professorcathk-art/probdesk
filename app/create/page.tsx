import { redirect } from "next/navigation";
import { listMyIntents } from "@/actions/intents";
import { CreateWizard } from "@/components/meetup/create-wizard";
import { getAuthContext } from "@/lib/auth-context";
import { ensureProfileCoreCompleteForAppUse } from "@/lib/ensure-profile-core";

export const dynamic = "force-dynamic";

export default async function CreatePage({
  searchParams,
}: {
  searchParams?: Promise<{ edit?: string }>;
}) {
  const { user } = await getAuthContext();
  if (!user) redirect("/login?after=%2Fcreate");
  await ensureProfileCoreCompleteForAppUse();
  const sp = (await searchParams) ?? {};
  const editId = typeof sp.edit === "string" ? sp.edit : "";
  const mine = editId ? await listMyIntents() : { intents: [] };
  const editing = "error" in mine ? null : (mine.intents.find((row) => row.id === editId) ?? null);

  return <CreateWizard editing={editing} />;
}
