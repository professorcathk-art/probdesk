import { redirect } from "next/navigation";

export default function ManageIntentsRedirectPage() {
  redirect("/console?tab=intents");
}
