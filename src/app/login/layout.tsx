import type { ReactNode } from "react";
import "../risk-share/manager/designer.css";
import "./designer-login.css";
import IconifyIconLoader from "../risk-share/manager/IconifyIconLoader";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <IconifyIconLoader />
      {children}
    </>
  );
}
