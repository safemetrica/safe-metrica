import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacyMonsContractorSubmittedPage() {
  redirect("/field/participation/submitted?company=mons&legacy=contractor-mons-submitted");
}
