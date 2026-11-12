import type { ResolvedSettings } from "@/lib/storyboard/settings";
import type { StoryboardOutcome } from "@/lib/storyboard/types";
import type { StoryboardTarget } from "@/lib/storyboard/target";

/** Everything a step screen needs from the server page, for any module. */
export type ScreenProps<S> = {
  /** What the screen saves to: a lead's storyboard or a practice session. */
  target: StoryboardTarget;
  /** True when the viewer may look but not save (a leader opening a downline practice session). */
  readOnly?: boolean;
  stored: S;
  notes: string;
  /** ISO time of the last save, from the database. */
  savedAt: string | null;
  /** False when nothing is saved yet (steps 2-4 can't save until Step 1 is). */
  hasRow: boolean;
  /** False when the storyboard tables are missing; saving is disabled. */
  dbReady: boolean;
  settings: ResolvedSettings;
  agentFirstName: string;
  outcome: StoryboardOutcome | null;
};

/** The part every module's stored state shares: the Step 3 and Step 4 ticks. */
export type TickedStored = { riskChecked: string[]; raised: string[] };
