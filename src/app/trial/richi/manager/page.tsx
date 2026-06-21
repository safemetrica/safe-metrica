import { redirect } from "next/navigation";

export default function RichiTrialManagerLegacyRedirectPage() {
  redirect("/select-tenant?code=richi&next=/manager/risk-share");
}
