import { redirect } from "next/navigation";

export default function RichiTrialLegacyRedirectPage() {
  redirect("/field/participation?company=richi");
}
