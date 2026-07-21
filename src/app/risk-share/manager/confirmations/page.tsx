import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ company?: string }>;
}) {
  const company = String((await searchParams)?.company ?? "")
    .trim()
    .toLowerCase();

  redirect(
    `/risk-share/manager?company=${encodeURIComponent(company)}#confirmation-review`,
  );
}
