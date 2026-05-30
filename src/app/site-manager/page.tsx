import { redirect } from "next/navigation";

import {
  isSiteManagerAllowedCompanyCode,
  isSubmitOnlyCompanyCode,
  normalizeRoleCompanyCode,
} from "@/lib/roleAccess";

export const dynamic = "force-dynamic";

export default async function SiteManagerPage({
  searchParams,
}: {
  searchParams?:
    | Promise<{ company?: string; code?: string; token?: string }>
    | { company?: string; code?: string; token?: string };
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const companyCode = normalizeRoleCompanyCode(
    resolvedSearchParams.company ?? resolvedSearchParams.code,
  );
  const token = resolvedSearchParams.token;

  if (isSubmitOnlyCompanyCode(companyCode)) {
    redirect("/login?error=site_manager_not_available");
  }

  if (companyCode) {
    if (!isSiteManagerAllowedCompanyCode(companyCode)) {
      redirect("/login?error=invalid_company");
    }

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
