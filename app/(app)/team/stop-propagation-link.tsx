"use client";

import Link, { type LinkProps } from "next/link";
import type { PropsWithChildren } from "react";

// A plain <Link> nested inside a <summary> would also toggle the parent
// <details> accordion when clicked -- this stops that bubble without
// requiring the whole row (a big block of server-rendered data) to be a
// client component just for one click handler.
export function StopPropagationLink({ children, ...props }: PropsWithChildren<LinkProps & { className?: string }>) {
  return (
    <Link {...props} onClick={(e) => e.stopPropagation()}>
      {children}
    </Link>
  );
}
