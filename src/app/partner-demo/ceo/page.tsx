import type { Metadata } from "next";
import CeoDemoClient from "./CeoDemoClient";

export const metadata: Metadata = {
  title: "대표 체험 | SafeMetrica Partner Demo",
  description: "대표용 운영현황, 위험 이슈, 월간보고서 샘플 대시보드입니다.",
};

export default function CeoDemoPage() {
  return <CeoDemoClient />;
}
