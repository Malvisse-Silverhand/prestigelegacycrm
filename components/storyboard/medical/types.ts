import type { MedicalStored } from "@/lib/storyboard/validate";
import type { ScreenProps } from "../screen-types";

/** Everything a Medical Card step screen needs from the server page. */
export type MedicalScreenProps = ScreenProps<MedicalStored>;
