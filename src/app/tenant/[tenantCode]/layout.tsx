import type { Metadata } from "next";
import { TenantShellPlaceholder } from "./TenantShellPlaceholder";

export const metadata: Metadata = {
  title: "SafeMetrica 운영공간 준비 화면",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TenantLayout({
  children,
  params,
}: LayoutProps<"/tenant/[tenantCode]">) {
  const { tenantCode } = await params;

  return (
    <TenantShellPlaceholder tenantCode={tenantCode}>
      {children}
    </TenantShellPlaceholder>
  );
}
