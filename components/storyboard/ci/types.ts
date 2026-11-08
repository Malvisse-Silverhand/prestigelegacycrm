import type { CiStored } from "@/lib/storyboard/validate";
import type { ScreenProps } from "../screen-types";

/** Everything a Critical Illness step screen needs from the server page. */
export type CiScreenProps = ScreenProps<CiStored>;
