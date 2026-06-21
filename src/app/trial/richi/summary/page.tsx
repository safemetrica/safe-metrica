import { redirect } from "next/navigation";

export default function RichiTrialSummaryLegacyRedirectPage() {
  redirect("/select-tenant?code=richi&next=/monthly-report/risk-share");
}
