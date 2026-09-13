"use client";

import { useSyncExternalStore } from "react";
import { SPECIMENS, randomSpecimen, type Specimen } from "./specimens";

// The pick lives outside React because it must not happen during a render: a
// client component renders once on the server and again when it hydrates, and
// a different pick between the two is a hydration mismatch. The server
// snapshot is always the first set, so both of those renders agree; the random
// one lands the moment a form subscribes, which is after hydration.
let picked: Specimen = SPECIMENS[0];
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Re-rolled per form rather than per session, so no single fake value gets
  // familiar enough to be mistaken for a real default. React re-reads the
  // snapshot straight after subscribing, so this is picked up without a
  // notification of its own.
  picked = randomSpecimen();
  for (const l of listeners) l();
  return () => {
    listeners.delete(onChange);
  };
}

const readPicked = () => picked;
const readFirst = () => SPECIMENS[0];

/** A random set of dummy placeholders, chosen without breaking hydration. */
export function useSpecimen(): Specimen {
  return useSyncExternalStore(subscribe, readPicked, readFirst);
}
