import type { ReactNode } from "react";

import "../risk-share/manager/designer.css";
import "../login/designer-login.css";
import IconifyIconLoader from "../risk-share/manager/IconifyIconLoader";

export default function SignupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <IconifyIconLoader />
      {children}
    </>
  );
}
