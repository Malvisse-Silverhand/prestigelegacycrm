import type { HibahStored } from "@/lib/storyboard/validate";
import type { ScreenProps } from "../screen-types";

/** Everything a Hibah step screen needs from the server page. */
export type HibahScreenProps = ScreenProps<HibahStored>;
