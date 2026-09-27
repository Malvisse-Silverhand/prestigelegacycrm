"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function ModalOverlay({ children }: { children: ReactNode }) {
  const router = useRouter();

  function close() {
    router.back();
  }

  return (
    <div
      // Flush on a phone -- lead-detail-content.tsx already tightens its own
      // padding at this breakpoint, so a flat p-6 gutter here would just add
      // back the space that was trimmed. sm: restores the original margin
      // once there is room for one. The only other consumer is this same
      // lead-detail modal (app/(app)/@modal/(.)leads/[id]/lead-modal-client.tsx).
      className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-2 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-[900px] overflow-y-auto">{children}</div>
    </div>
  );
}

export function useModalClose() {
  const router = useRouter();
  return () => router.back();
}
