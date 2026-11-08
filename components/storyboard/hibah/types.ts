import type { ResolvedHibahSettings } from "@/lib/storyboard/settings";
import type { HibahStored } from "@/lib/storyboard/validate";
import type { StoryboardOutcome } from "@/lib/storyboard/types";

/** Everything a Hibah step screen needs from the server page. */
export type HibahScreenProps = {
  leadId: string;
  stored: HibahStored;
  notes: string;
  /** ISO time of the last save, from the database. */
  savedAt: string | null;
  /** False when nothing is saved yet (steps 2-4 can't save until Step 1 is). */
  hasRow: boolean;
  /** False when the storyboard tables are missing; saving is disabled. */
  dbReady: boolean;
  settings: ResolvedHibahSettings;
  agentFirstName: string;
  outcome: StoryboardOutcome | null;
};
