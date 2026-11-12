"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  children: ReactNode;
};

/** Native <dialog> opened modally: focus is trapped, Esc closes it, and focus returns to the opener. */
export function Modal({ open, onClose, title, titleId, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(92vw,30rem)] rounded-[20px] border border-sand bg-white p-0 text-ink shadow-card backdrop:bg-black/40"
    >
      {open ? (
        <div className="flex flex-col gap-4 p-5">
          <h2 id={titleId} className="m-0 text-lg font-extrabold text-navy">
            {title}
          </h2>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
