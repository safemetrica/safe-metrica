import type { Metadata } from "next";
import ManagerDemoClient from "./ManagerDemoClient";

export const metadata: Metadata = {
  title: "현장관리자 체험 | SafeMetrica Partner Demo",
  description: "현장관리자용 오늘 할 일과 TBM, 위험제보 처리 샘플 흐름입니다.",
};

export default function ManagerDemoPage() {
  return <ManagerDemoClient />;
}
