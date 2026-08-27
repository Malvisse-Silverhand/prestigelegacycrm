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
      className="fixed inset-0 z-30 flex items-center justify-center bg-navy/55 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-[820px] overflow-y-auto">{children}</div>
    </div>
  );
}

export function useModalClose() {
  const router = useRouter();
  return () => router.back();
}
