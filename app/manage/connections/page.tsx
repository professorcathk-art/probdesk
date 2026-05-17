import { redirect } from "next/navigation";

export default function ManageConnectionsRedirectPage() {
  redirect("/console?tab=connections");
}
