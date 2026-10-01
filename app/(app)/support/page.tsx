import { redirect } from "next/navigation";

// Support is a group, not a page of its own: land on its first section.
export default function SupportPage() {
  redirect("/support/tickets");
}
