import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function normalizeCompanyCode(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

export default async function SiteManagerPage({
  searchParams,
}: {
  searchParams?: Promise<{ company?: string; code?: string; token?: string }> | { company?: string; code?: string; token?: string };
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const companyCode = normalizeCompanyCode(resolvedSearchParams.company ?? resolvedSearchParams.code);
  const token = resolvedSearchParams.token;

  if (companyCode) {
    const params = new URLSearchParams({
      code: companyCode,
      next: "/home?role=manager",
    });

    if (token) {
      params.set("token", token);
    }

    redirect(`/select-tenant?${params.toString()}`);
  }

  redirect("/home?role=manager");
}
