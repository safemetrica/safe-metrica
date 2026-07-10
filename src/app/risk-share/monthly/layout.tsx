import type { ReactNode } from "react";
import "../manager/designer.css";
import IconifyIconLoader from "../manager/IconifyIconLoader";

export default function RiskShareMonthlyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <IconifyIconLoader />
      {children}
    </>
  );
}
