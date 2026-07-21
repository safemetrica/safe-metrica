import type { Metadata } from "next";
import type { ReactNode } from "react";

import IconifyIconLoader from "@/app/risk-share/manager/IconifyIconLoader";
import "@/app/risk-share/manager/designer.css";
import "./preview.css";

export const metadata: Metadata = {
  title: "관리자 접수함 구조 미리보기 | SafeMetrica",
  description: "고객사 관리자 업무 흐름 검토를 위한 합성 데이터 화면",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function ManagerInboxPreviewLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <IconifyIconLoader />
      {children}
    </>
  );
}
