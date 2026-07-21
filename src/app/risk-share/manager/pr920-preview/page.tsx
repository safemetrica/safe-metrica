import ManagerDesignerView from "@/components/risk-share/manager/ManagerDesignerView";

async function previewAction() {
  "use server";
}

export default function Page() {
  return (
    <ManagerDesignerView
      companyLabel="샘플 제조 사업장"
      companyCode="test-risk-pack-01"
      managerHref="#"
      monthlyHref="#"
      confirmationReviewHref="#confirmation-review"
      fieldHref="#"
      monthLabel="2026년 7월"
      todayLabel="2026.07.21 화"
      siteProfile={{ status: "ok", siteName: "샘플 제조 사업장", profileComplete: true }}
      counts={{ monthly: 1, prework: 0, anonymous: 0, visitor: 0, representative: 0 }}
      statuses={{ monthly: "ok", prework: "ok", anonymous: "ok", visitor: "ok", representative: "ok" }}
      totalSubmissionCount={1}
      totalSubmissionIsComplete
      representative={{ totalCount: 0, signatureConfirmedCount: 0, signatureNotSubmittedCount: 0, status: "ok" }}
      reviewStatus={[
        { label: "확인 필요", value: 1, colorVar: "--c3" },
        { label: "확인 중", value: 0, colorVar: "--c1" },
        { label: "처리 완료", value: 0, colorVar: "--c2" },
      ]}
      confirmationReviewAction={previewAction}
      recentSubmissions={[
        {
          id: "91700000-0000-4917-8917-000000000001",
          reviewStatus: "unreviewed",
          actionNote: "",
          category: "공유확인",
          categoryBadgeClass: "b-blue",
          submitterLabel: "근로자 확인",
          detail: "근로자 공유확인 최종 E2E",
          submittedAtLabel: "2026-07-21 10:30",
          statusLabel: "확인 필요",
          statusBadgeClass: "b-orange",
        },
      ]}
      userDisplayName="검수 관리자"
      userEmail="manager@example.com"
      avatarInitial="검"
      weeklyTrendFallbackLabels={["7.15", "7.16", "7.17", "7.18", "7.19", "7.20", "오늘"]}
    />
  );
}
