import type { BusinessStored } from "@/lib/storyboard/validate";
import type { ScreenProps } from "../screen-types";

/** Everything a Business Protection step screen needs from the server page. */
export type BusinessScreenProps = ScreenProps<BusinessStored>;
