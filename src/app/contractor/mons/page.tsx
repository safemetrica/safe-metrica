import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacyMonsContractorPage() {
  redirect("/field/participation?company=mons&legacy=contractor-mons");
}
