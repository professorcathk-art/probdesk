import { redirect } from "next/navigation";

export default function ManageInvitationsRedirectPage() {
  redirect("/console?tab=requests");
}
