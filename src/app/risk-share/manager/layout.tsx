import type { ReactNode } from "react";
import "./designer.css";
import IconifyIconLoader from "./IconifyIconLoader";

export default function RiskShareManagerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <IconifyIconLoader />
      {children}
    </>
  );
}
