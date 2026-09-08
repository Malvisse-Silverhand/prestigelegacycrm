import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { RouteProgress } from "@/components/route-progress";

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
      {/* Route-change progress. useSearchParams needs a Suspense boundary in
          the App Router, and this is purely decorative, so it suspends to
          nothing rather than holding up the shell. */}
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      <Sidebar profile={profile} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>
        <div className="fixed inset-x-0 bottom-0 z-10">
          <MobileNav profile={profile} />
        </div>
      </div>
      {modal}
    </div>
  );
}
