import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh bg-cream">
      <Sidebar profile={profile} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>
        <div className="fixed inset-x-0 bottom-0 z-10">
          <MobileNav />
        </div>
      </div>
      {modal}
    </div>
  );
}
