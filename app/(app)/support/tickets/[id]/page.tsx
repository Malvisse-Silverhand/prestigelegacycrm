import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getSuperAdmins, getTicketDetail } from "../data";
import { NotSetUp } from "../ticket-chips";
import { TicketDetailView } from "./ticket-detail";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { id } = await params;
  const result = await getTicketDetail(id);

  if (result.state === "not_setup") return <NotSetUp />;
  if (result.state === "not_found") {
    return (
      <div className="px-5 py-10 lg:px-[30px]">
        <div className="mx-auto max-w-md rounded-2xl border border-sand bg-white p-6 text-center">
          <div className="text-[15px] font-bold text-navy">Ticket not found</div>
          <p className="mt-1.5 text-[12.5px] font-medium text-muted">
            It may have been removed, or it belongs to someone else.
          </p>
          <Link
            href="/support/tickets"
            className="mt-4 inline-block rounded-[10px] border border-sand-2 px-4 py-2.5 text-[13px] font-semibold text-navy"
          >
            Back to tickets
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = profile.role === "superadmin";
  const staff = isAdmin ? await getSuperAdmins() : [];

  return (
    <TicketDetailView
      detail={result.detail}
      viewerId={profile.id}
      isAdmin={isAdmin}
      staff={staff}
    />
  );
}
