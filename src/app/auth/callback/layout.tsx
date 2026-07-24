import type { ReactNode } from "react";

import IconifyIconLoader from "@/app/risk-share/manager/IconifyIconLoader";
import "@/app/risk-share/manager/designer.css";
import "@/app/login/designer-login.css";

export default function AuthCallbackLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <IconifyIconLoader />
      {children}
    </>
  );
}
