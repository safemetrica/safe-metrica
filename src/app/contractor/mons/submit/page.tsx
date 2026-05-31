import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacyMonsContractorSubmitPage() {
  redirect("/field/participation?company=mons&legacy=contractor-mons-submit");
}
