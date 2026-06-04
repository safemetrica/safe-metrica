import type { Metadata } from "next";
import WorkerDemoClient from "./WorkerDemoClient";

export const metadata: Metadata = {
  title: "근로자 체험 | SafeMetrica Partner Demo",
  description: "근로자용 위험 확인, 주지 확인, 의견 제출 샘플 흐름입니다.",
};

export default function WorkerDemoPage() {
  return <WorkerDemoClient />;
}
