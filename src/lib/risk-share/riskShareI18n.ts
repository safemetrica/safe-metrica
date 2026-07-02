export type RiskShareLocale = "ko" | "en" | "vi";

const SUPPORTED_LOCALES: readonly RiskShareLocale[] = ["ko", "en", "vi"];

export function getRiskShareLocale(value?: string | string[] | null): RiskShareLocale {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = (raw ?? "").trim().toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(normalized)
    ? (normalized as RiskShareLocale)
    : "ko";
}

export const RISK_SHARE_LANGUAGE_OPTIONS: { code: RiskShareLocale; label: string }[] = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
  { code: "vi", label: "Tiếng Việt" },
];

export const RISK_SHARE_LANGUAGES_SOON = ["中文", "ไทย", "Bahasa", "Русский"];

export function buildRiskShareLangHref(
  pathname: string,
  query: Record<string, string | undefined>,
  lang: RiskShareLocale,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  params.set("lang", lang);
  return `${pathname}?${params.toString()}`;
}

type FieldCopy = {
  heroTitle: string;
  heroSub: string;
  periodLabel: (month: number) => string;
  trail: string[];
  shareTitle: string;
  shareDescription: string;
  shareFollowUp: string;
  shareBadge: string;
  shareCta: string;
  preworkTitle: string;
  preworkDescription: string;
  preworkFollowUp: string;
  preworkBadge: string;
  preworkCta: string;
  anonTitle: string;
  anonDescription: string;
  anonFollowUp: string;
  anonBadge: string;
  anonCta: string;
  recordNoteLabel: string;
  recordNoteBody: string;
  previewSummary: string;
  helpline: string;
  visitorTitle: string;
  visitorBadge: string;
  visitorDescription: string;
  footerDisclaimer: string;
  qrCheckingTitle: string;
  noCodeBody: string;
  notRegisteredBody: string;
  returnToField: string;
};

type ParticipationCopy = {
  monthly: {
    badge: string;
    title: string;
    description: string;
    cta: string;
    checklist: string[];
    flow: string[];
  };
  prework: {
    badge: string;
    title: string;
    description: string;
    cta: string;
    checklist: string[];
    flow: string[];
  };
  checklistLegend: string;
  afterSubmitLabel: string;
  afterSubmitBody: string;
  submitPendingNote: string;
  qrCheckingTitle: string;
  notAllowedBody: string;
  returnToField: string;
};

type AnonymousCopy = {
  heroTitle: string;
  heroSub: string;
  bannerBody: string;
  typeLegend: string;
  typeChoices: { value: "위험제보" | "아차사고" | "개선제안" | "불편사항"; icon: string; label: string }[];
  locationLabel: string;
  locationPlaceholder: string;
  contentLabel: string;
  contentPlaceholder: string;
  photoLabel: string;
  photoOptional: string;
  preSubmitTitle: string;
  preSubmitBody: string;
  afterSubmitLabel: string;
  afterSubmitBody: string;
  submitCta: string;
  returnToField: string;
  qrCheckingTitle: string;
  notAllowedBody: string;
};

type VisitorCopy = {
  heroTitle: string;
  heroSubLine1: string;
  heroSubLine2: string;
  purposeLegend: string;
  purposes: string[];
  companyLabel: string;
  companyPlaceholder: string;
  nameLabel: string;
  namePlaceholder: string;
  noticesLegend: string;
  notices: { icon: string; title: string; body: string }[];
  confirmLabel: string;
  submitCta: string;
  submitPendingNote: string;
  smallprint: string;
  returnToField: string;
  qrCheckingTitle: string;
  notAllowedBody: string;
};

type RiskShareCopy = {
  field: FieldCopy;
  participation: ParticipationCopy;
  anonymous: AnonymousCopy;
  visitor: VisitorCopy;
};

const COPY: Record<RiskShareLocale, RiskShareCopy> = {
  ko: {
    field: {
      heroTitle: "우리 작업장 안전 확인",
      heroSub: "QR로 들어오셨네요. 아래에서 할 일을 선택해 주세요.",
      periodLabel: (month) => `${month}월 위험성평가 공유확인 진행 중`,
      trail: ["공유", "확인 — 지금 단계", "관리자 검토", "월간 안전운영 요약"],
      shareTitle: "위험성평가 공유확인",
      shareDescription: "이번 달 공유된 위험요인을 확인합니다. 약 3분.",
      shareFollowUp: "관리자 검토를 거쳐 다음 위험성평가 재검토 후보로 이어집니다.",
      shareBadge: "공유확인",
      shareCta: "공유확인 시작",
      preworkTitle: "작업 전 안전확인",
      preworkDescription: "작업 전 주의사항을 확인합니다. 매일 1회.",
      preworkFollowUp: "확인 기록은 관리자 검토를 거쳐 월간 안전운영 요약에 반영됩니다.",
      preworkBadge: "작업 전 확인",
      preworkCta: "작업 전 확인 시작",
      anonTitle: "익명 의견 · 아차사고 · 개선제안",
      anonDescription: "이름 없이 의견이나 위험신호를 남깁니다.",
      anonFollowUp: "접수된 의견은 관리자 검토를 거쳐 안전운영 자료로 남습니다.",
      anonBadge: "이름 없이",
      anonCta: "익명 의견함 열기",
      recordNoteLabel: "기록",
      recordNoteBody:
        "여기서 남긴 확인과 의견은 우리 회사의 안전운영기록으로 정리되고, 관리자가 검토한 뒤 월간 안전운영 요약에 반영됩니다.",
      previewSummary: "공유확인 화면 미리보기 — “위험성평가 공유확인”을 누르면",
      helpline: "확인이 어려우면 현장 담당자에게 문의해 주세요.",
      visitorTitle: "외부인 출입 전 안전 안내",
      visitorBadge: "준비 중",
      visitorDescription: "방문·납품·협력업체는 출입 전 안전 안내를 확인합니다. 제출 접수는 준비 중입니다.",
      footerDisclaimer:
        "근로자와 외부인은 로그인 없이 QR로 참여합니다. 확인과 의견은 관리자 검토를 거쳐 월간 안전운영 요약으로 남습니다.",
      qrCheckingTitle: "현장 QR 확인 중",
      noCodeBody: "회사코드가 포함된 QR 링크가 필요합니다. 현장 담당자에게 새 QR 링크를 요청해 주세요.",
      notRegisteredBody: "이 QR 링크는 아직 사용할 수 없습니다. 현장 담당자에게 최신 QR 링크를 요청해 주세요.",
      returnToField: "현장 QR 입구로 돌아가기",
    },
    participation: {
      monthly: {
        badge: "공유확인",
        title: "위험성평가 공유확인",
        description: "이번 달 공유된 위험요인과 안전조치를 확인합니다.",
        cta: "공유확인 제출",
        checklist: [
          "공유된 위험요인을 확인했습니다.",
          "현장 주의사항을 확인했습니다.",
          "의견이 있으면 익명 의견함에 남길 수 있습니다.",
        ],
        flow: ["확인 내용", "운영기록 후보", "관리자 검토", "월간 안전운영 요약", "다음 위험성평가 보완 후보"],
      },
      prework: {
        badge: "작업 전 확인",
        title: "작업 전 안전확인",
        description: "오늘 작업 전 보호구, 동선, 적재·하역, 설비 주변 주의사항을 확인합니다.",
        cta: "작업 전 확인 제출",
        checklist: [
          "오늘 작업 전 주의사항을 확인했습니다.",
          "보호구와 작업 동선을 확인했습니다.",
          "이상이 있으면 관리자에게 알리거나 익명 의견함에 남길 수 있습니다.",
        ],
        flow: ["작업 전 확인", "운영기록 후보", "관리자 검토", "월간 안전운영 요약"],
      },
      checklistLegend: "확인 항목",
      afterSubmitLabel: "제출 이후",
      afterSubmitBody: "확인 내용은 운영기록 후보로 남아 관리자 검토를 거쳐 월간 안전운영 요약에 반영됩니다.",
      submitPendingNote: "제출 기능은 준비 중입니다. 곧 이 화면에서 바로 확인을 제출할 수 있습니다.",
      qrCheckingTitle: "현장 QR 확인 중",
      notAllowedBody: "이 확인 화면은 지정된 현장 QR에서만 열립니다. 현장 담당자에게 최신 QR 링크를 요청해 주세요.",
      returnToField: "현장 QR 입구로 돌아가기",
    },
    anonymous: {
      heroTitle: "익명 의견함",
      heroSub: "이름 없이 남길 수 있습니다. 관리자가 검토한 뒤 반영합니다.",
      bannerBody: "이 화면에는 이름·서명 칸이 없습니다. 누가 썼는지 표시되지 않으며, 내용만 관리자에게 전달됩니다.",
      typeLegend: "어떤 내용인가요?",
      typeChoices: [
        { value: "위험제보", icon: "⚠️", label: "위험해 보여요" },
        { value: "아차사고", icon: "😨", label: "아차사고 있었어요" },
        { value: "개선제안", icon: "💡", label: "개선이 필요해요" },
        { value: "불편사항", icon: "❓", label: "안내가 이해 안 돼요" },
      ],
      locationLabel: "위치 · 작업구역",
      locationPlaceholder: "예: 작업장 입구 / 통로",
      contentLabel: "내용",
      contentPlaceholder: "어떤 상황이었는지 편하게 적어 주세요.",
      photoLabel: "사진 첨부",
      photoOptional: "선택",
      preSubmitTitle: "제출 전 확인",
      preSubmitBody:
        "이 화면은 익명 의견 접수용입니다. 작업 전 확인 기록은 별도 확인 화면에서 제출해야 합니다. 어떤 언어로 적어도 접수됩니다.",
      afterSubmitLabel: "접수 이후",
      afterSubmitBody: "제출 내용은 관리자 검토 후보로 접수되어, 검토를 거쳐 월간 안전운영 요약에 반영됩니다.",
      submitCta: "익명으로 제출하기 →",
      returnToField: "현장 QR 입구로 돌아가기",
      qrCheckingTitle: "익명 의견 접수 화면을 열 수 없습니다.",
      notAllowedBody: "현재 이 익명 의견 경로는 지정된 현장 QR에서만 사용할 수 있습니다.",
    },
    visitor: {
      heroTitle: "방문자 출입 전 안전 안내",
      heroSubLine1: "출입 전에 아래 안내를 확인해 주세요.",
      heroSubLine2: "약 1분.",
      purposeLegend: "방문 목적",
      purposes: ["일반 방문", "납품", "상하차", "협력업체 작업", "점검·정비", "기타"],
      companyLabel: "소속(업체명)",
      companyPlaceholder: "예: 한빛물류",
      nameLabel: "확인자 이름",
      namePlaceholder: "예: 김확인",
      noticesLegend: "출입 전 주요 주의사항",
      notices: [
        { icon: "🚶", title: "지정 통로로만 이동", body: "노란 보행선 밖은 지게차 동선입니다. 안내자 없이 작업 구역에 들어가지 마세요." },
        { icon: "🚛", title: "하역장 후진 차량 주의", body: "차량 후진 시 유도자 신호를 따라 주세요. 차량 뒤편 대기 금지." },
        { icon: "🚨", title: "비상시 집결 장소", body: "비상벨이 울리면 정문 앞 주차장으로 이동해 주세요." },
      ],
      confirmLabel: "위 안전 안내를 확인했습니다.",
      submitCta: "확인하고 출입하기",
      submitPendingNote: "제출 기능은 준비 중입니다. 운영자 확인 후 이 화면에서 바로 연결될 예정입니다.",
      smallprint: "확인 내용은 출입 안전확인 기록으로만 사용될 예정입니다. 확인이 어려우면 현장 담당자에게 문의해 주세요.",
      returnToField: "현장 QR 입구로 돌아가기",
      qrCheckingTitle: "현장 QR 확인 중",
      notAllowedBody: "이 안내 화면은 지정된 현장 QR에서만 열립니다. 현장 담당자에게 최신 QR 링크를 요청해 주세요.",
    },
  },
  en: {
    field: {
      heroTitle: "Workplace Safety Check",
      heroSub: "You scanned the QR. Choose what to do below.",
      periodLabel: () => "Risk-sharing check in progress this month",
      trail: ["Share", "Confirm — you are here", "Manager review", "Monthly summary"],
      shareTitle: "Risk-sharing check",
      shareDescription: "Review this month's shared hazards. About 3 min.",
      shareFollowUp: "After manager review, this may feed into the next risk assessment update.",
      shareBadge: "Confirm sharing",
      shareCta: "Start risk-sharing check",
      preworkTitle: "Pre-work safety check",
      preworkDescription: "Check today's safety points before work. Once a day.",
      preworkFollowUp: "Reviewed by a manager and reflected in the monthly safety summary.",
      preworkBadge: "Pre-work check",
      preworkCta: "Start pre-work check",
      anonTitle: "Anonymous report · near-miss · idea",
      anonDescription: "Leave a concern or hazard signal without your name.",
      anonFollowUp: "Reports are reviewed by a manager and kept as safety operation records.",
      anonBadge: "No name needed",
      anonCta: "Open anonymous box",
      recordNoteLabel: "Record",
      recordNoteBody:
        "Your confirmations and reports become part of the company's safety operation record, reviewed by a manager and summarized monthly.",
      previewSummary: "Preview — after tapping “Risk-sharing check”",
      helpline: "If anything is unclear, ask the site manager.",
      visitorTitle: "Visitor safety notice before entry",
      visitorBadge: "Coming soon",
      visitorDescription: "Visitors, deliveries and contractors review safety notes before entry. Submission is not yet connected.",
      footerDisclaimer:
        "Workers and visitors join with no login, using the QR. Confirmations and reports are reviewed by a manager and kept in the monthly safety summary.",
      qrCheckingTitle: "Checking field QR",
      noCodeBody: "A QR link with a company code is required. Ask the site manager for a new QR link.",
      notRegisteredBody: "This QR link is not active yet. Ask the site manager for the latest QR link.",
      returnToField: "Back to field QR entry",
    },
    participation: {
      monthly: {
        badge: "Confirm sharing",
        title: "Risk-sharing check",
        description: "Review this month's shared hazards and safety measures.",
        cta: "Submit risk-sharing check",
        checklist: [
          "I have reviewed the shared hazards.",
          "I have checked the on-site precautions.",
          "I can leave a comment in the anonymous box if I have one.",
        ],
        flow: ["Confirmation", "Record candidate", "Manager review", "Monthly summary", "Next assessment candidate"],
      },
      prework: {
        badge: "Pre-work check",
        title: "Pre-work safety check",
        description: "Check today's PPE, walkways, loading/unloading and equipment-area precautions.",
        cta: "Submit pre-work check",
        checklist: [
          "I have checked today's pre-work precautions.",
          "I have checked my PPE and work route.",
          "I can notify the manager or leave a note in the anonymous box if something is wrong.",
        ],
        flow: ["Pre-work check", "Record candidate", "Manager review", "Monthly summary"],
      },
      checklistLegend: "Checklist",
      afterSubmitLabel: "After submission",
      afterSubmitBody: "Your confirmation stays as a record candidate, is reviewed by a manager, and is reflected in the monthly safety summary.",
      submitPendingNote: "Submission is not yet connected. Soon you will be able to submit right from this screen.",
      qrCheckingTitle: "Checking field QR",
      notAllowedBody: "This confirmation screen only opens from the designated field QR. Ask the site manager for the latest QR link.",
      returnToField: "Back to field QR entry",
    },
    anonymous: {
      heroTitle: "Anonymous box",
      heroSub: "No name needed. A manager reviews before action.",
      bannerBody: "This form has no name or signature field. Your identity is not shown — only the content goes to the manager.",
      typeLegend: "What is it about?",
      typeChoices: [
        { value: "위험제보", icon: "⚠️", label: "Looks dangerous" },
        { value: "아차사고", icon: "😨", label: "Near-miss happened" },
        { value: "개선제안", icon: "💡", label: "Needs improvement" },
        { value: "불편사항", icon: "❓", label: "Instructions unclear" },
      ],
      locationLabel: "Location · area",
      locationPlaceholder: "e.g. warehouse entrance",
      contentLabel: "Details",
      contentPlaceholder: "Describe the situation in your own words.",
      photoLabel: "Photo",
      photoOptional: "optional",
      preSubmitTitle: "Before you submit",
      preSubmitBody:
        "This screen is for anonymous reports only. Pre-work confirmations must be submitted on a separate screen. You can write in any language.",
      afterSubmitLabel: "After submission",
      afterSubmitBody: "Your report is received as a review candidate and, after review, is reflected in the monthly safety summary.",
      submitCta: "Submit anonymously →",
      returnToField: "Back to field QR entry",
      qrCheckingTitle: "This anonymous report screen is not available.",
      notAllowedBody: "This anonymous report link only works from the designated field QR.",
    },
    visitor: {
      heroTitle: "Visitor safety notes before entry",
      heroSubLine1: "Please read the notes below before entering.",
      heroSubLine2: "About 1 minute.",
      purposeLegend: "Purpose of visit",
      purposes: ["Visit", "Delivery", "Loading", "Contractor work", "Maintenance", "Other"],
      companyLabel: "Company",
      companyPlaceholder: "e.g. Hanbit Logistics",
      nameLabel: "Your name",
      namePlaceholder: "e.g. Kim",
      noticesLegend: "Key safety notes before entry",
      notices: [
        { icon: "🚶", title: "Stay on marked walkways", body: "Outside the yellow lines is forklift traffic. Do not enter work areas without a guide." },
        { icon: "🚛", title: "Watch for reversing trucks", body: "Follow the signaler when trucks reverse. Never stand behind a vehicle." },
        { icon: "🚨", title: "Emergency assembly point", body: "If the alarm sounds, go to the parking lot by the main gate." },
      ],
      confirmLabel: "I have read the safety notes above.",
      submitCta: "Confirm and enter",
      submitPendingNote: "Submission is not yet connected. It will be linked here once an operator sets it up.",
      smallprint: "This will be used only as an entry safety-check record. Ask site staff if anything is unclear.",
      returnToField: "Back to field QR entry",
      qrCheckingTitle: "Checking field QR",
      notAllowedBody: "This notice screen only opens from the designated field QR. Ask the site manager for the latest QR link.",
    },
  },
  vi: {
    field: {
      heroTitle: "Kiểm tra an toàn nơi làm việc",
      heroSub: "Bạn đã quét mã QR. Hãy chọn việc cần làm bên dưới.",
      periodLabel: (month) => `Đang xác nhận chia sẻ rủi ro tháng ${month}`,
      trail: ["Chia sẻ", "Xác nhận — bước hiện tại", "Quản lý xem xét", "Báo cáo an toàn tháng"],
      shareTitle: "Xác nhận rủi ro đã chia sẻ",
      shareDescription: "Xem các mối nguy đã chia sẻ tháng này. Khoảng 3 phút.",
      shareFollowUp: "Sau khi quản lý xem xét, nội dung có thể trở thành ứng viên rà soát đánh giá rủi ro tiếp theo.",
      shareBadge: "Xác nhận chia sẻ",
      shareCta: "Bắt đầu xác nhận",
      preworkTitle: "Kiểm tra trước khi làm việc",
      preworkDescription: "Kiểm tra lưu ý an toàn trước khi làm. Mỗi ngày 1 lần.",
      preworkFollowUp: "Quản lý xem xét và tổng hợp vào báo cáo an toàn hàng tháng.",
      preworkBadge: "Kiểm tra trước khi làm",
      preworkCta: "Bắt đầu kiểm tra",
      anonTitle: "Ý kiến ẩn danh · suýt tai nạn · đề xuất",
      anonDescription: "Gửi ý kiến hoặc cảnh báo nguy hiểm mà không cần tên.",
      anonFollowUp: "Ý kiến được quản lý xem xét và lưu làm hồ sơ vận hành an toàn.",
      anonBadge: "Không cần tên",
      anonCta: "Mở hộp ý kiến ẩn danh",
      recordNoteLabel: "Lưu hồ sơ",
      recordNoteBody:
        "Xác nhận và ý kiến của bạn được lưu vào hồ sơ vận hành an toàn của công ty, quản lý xem xét và tổng hợp hàng tháng.",
      previewSummary: "Xem trước — sau khi bấm “Xác nhận rủi ro”",
      helpline: "Nếu có điều chưa rõ, hãy hỏi người phụ trách hiện trường.",
      visitorTitle: "Hướng dẫn an toàn cho khách trước khi vào",
      visitorBadge: "Sắp ra mắt",
      visitorDescription: "Khách, giao hàng, nhà thầu xem hướng dẫn an toàn trước khi vào. Chức năng gửi chưa được kết nối.",
      footerDisclaimer:
        "Người lao động và khách tham gia không cần đăng nhập, chỉ bằng mã QR. Xác nhận và ý kiến được quản lý xem xét và lưu vào báo cáo an toàn hàng tháng.",
      qrCheckingTitle: "Đang kiểm tra mã QR hiện trường",
      noCodeBody: "Cần liên kết QR có mã công ty. Hãy hỏi người phụ trách hiện trường để lấy liên kết QR mới.",
      notRegisteredBody: "Liên kết QR này chưa thể sử dụng. Hãy hỏi người phụ trách hiện trường để lấy liên kết QR mới nhất.",
      returnToField: "Quay lại cổng vào QR hiện trường",
    },
    participation: {
      monthly: {
        badge: "Xác nhận chia sẻ",
        title: "Xác nhận rủi ro đã chia sẻ",
        description: "Xem các mối nguy và biện pháp an toàn đã chia sẻ tháng này.",
        cta: "Gửi xác nhận chia sẻ",
        checklist: [
          "Tôi đã xem các mối nguy đã chia sẻ.",
          "Tôi đã xem lưu ý an toàn tại hiện trường.",
          "Nếu có ý kiến, tôi có thể gửi vào hộp ý kiến ẩn danh.",
        ],
        flow: ["Nội dung xác nhận", "Ứng viên hồ sơ vận hành", "Quản lý xem xét", "Báo cáo an toàn tháng", "Ứng viên rà soát đánh giá rủi ro tiếp theo"],
      },
      prework: {
        badge: "Kiểm tra trước khi làm",
        title: "Kiểm tra trước khi làm việc",
        description: "Kiểm tra đồ bảo hộ, lối đi, bốc dỡ hàng và khu vực thiết bị trước khi làm việc.",
        cta: "Gửi kiểm tra trước khi làm",
        checklist: [
          "Tôi đã xem lưu ý trước khi làm việc hôm nay.",
          "Tôi đã kiểm tra đồ bảo hộ và lối đi làm việc.",
          "Nếu có bất thường, tôi có thể báo quản lý hoặc gửi vào hộp ý kiến ẩn danh.",
        ],
        flow: ["Kiểm tra trước khi làm", "Ứng viên hồ sơ vận hành", "Quản lý xem xét", "Báo cáo an toàn tháng"],
      },
      checklistLegend: "Mục cần xác nhận",
      afterSubmitLabel: "Sau khi gửi",
      afterSubmitBody: "Nội dung xác nhận được lưu làm ứng viên hồ sơ vận hành, quản lý xem xét và tổng hợp vào báo cáo an toàn hàng tháng.",
      submitPendingNote: "Chức năng gửi chưa được kết nối. Bạn sẽ sớm gửi xác nhận ngay tại màn hình này.",
      qrCheckingTitle: "Đang kiểm tra mã QR hiện trường",
      notAllowedBody: "Màn hình xác nhận này chỉ mở từ mã QR hiện trường được chỉ định. Hãy hỏi người phụ trách hiện trường để lấy liên kết QR mới nhất.",
      returnToField: "Quay lại cổng vào QR hiện trường",
    },
    anonymous: {
      heroTitle: "Hộp ý kiến ẩn danh",
      heroSub: "Không cần tên. Quản lý sẽ xem xét trước khi xử lý.",
      bannerBody: "Biểu mẫu này không có ô tên hay chữ ký. Không hiển thị ai đã viết — chỉ nội dung được gửi đến quản lý.",
      typeLegend: "Nội dung gì?",
      typeChoices: [
        { value: "위험제보", icon: "⚠️", label: "Có vẻ nguy hiểm" },
        { value: "아차사고", icon: "😨", label: "Suýt xảy ra tai nạn" },
        { value: "개선제안", icon: "💡", label: "Cần cải thiện" },
        { value: "불편사항", icon: "❓", label: "Hướng dẫn khó hiểu" },
      ],
      locationLabel: "Vị trí · khu vực",
      locationPlaceholder: "VD: cửa kho",
      contentLabel: "Chi tiết",
      contentPlaceholder: "Mô tả tình huống theo cách của bạn.",
      photoLabel: "Ảnh",
      photoOptional: "không bắt buộc",
      preSubmitTitle: "Trước khi gửi",
      preSubmitBody:
        "Màn hình này chỉ dùng để gửi ý kiến ẩn danh. Xác nhận trước khi làm việc phải gửi ở màn hình riêng. Bạn có thể viết bằng bất kỳ ngôn ngữ nào.",
      afterSubmitLabel: "Sau khi gửi",
      afterSubmitBody: "Nội dung được tiếp nhận làm ứng viên xem xét, sau khi quản lý xem xét sẽ được tổng hợp vào báo cáo an toàn hàng tháng.",
      submitCta: "Gửi ẩn danh →",
      returnToField: "Quay lại cổng vào QR hiện trường",
      qrCheckingTitle: "Không thể mở màn hình gửi ý kiến ẩn danh.",
      notAllowedBody: "Đường dẫn ý kiến ẩn danh này chỉ hoạt động từ mã QR hiện trường được chỉ định.",
    },
    visitor: {
      heroTitle: "Hướng dẫn an toàn trước khi vào",
      heroSubLine1: "Vui lòng xem hướng dẫn bên dưới trước khi vào.",
      heroSubLine2: "Khoảng 1 phút.",
      purposeLegend: "Mục đích",
      purposes: ["Thăm", "Giao hàng", "Bốc xếp", "Nhà thầu", "Bảo trì", "Khác"],
      companyLabel: "Công ty",
      companyPlaceholder: "VD: Hanbit Logistics",
      nameLabel: "Tên của bạn",
      namePlaceholder: "VD: Nguyen",
      noticesLegend: "Lưu ý an toàn trước khi vào",
      notices: [
        { icon: "🚶", title: "Chỉ đi theo lối đi quy định", body: "Ngoài vạch vàng là đường xe nâng. Không vào khu làm việc khi không có người hướng dẫn." },
        { icon: "🚛", title: "Cẩn thận xe lùi ở bãi dỡ hàng", body: "Làm theo tín hiệu của người điều phối khi xe lùi. Không đứng sau xe." },
        { icon: "🚨", title: "Điểm tập trung khẩn cấp", body: "Khi có chuông báo động, hãy đến bãi đỗ xe trước cổng chính." },
      ],
      confirmLabel: "Tôi đã xem các hướng dẫn an toàn trên.",
      submitCta: "Xác nhận và vào",
      submitPendingNote: "Chức năng gửi chưa được kết nối. Sẽ được liên kết tại đây sau khi người vận hành thiết lập.",
      smallprint: "Chỉ dùng làm hồ sơ xác nhận an toàn khi vào. Hỏi nhân viên hiện trường nếu chưa rõ.",
      returnToField: "Quay lại cổng vào QR hiện trường",
      qrCheckingTitle: "Đang kiểm tra mã QR hiện trường",
      notAllowedBody: "Màn hình hướng dẫn này chỉ mở từ mã QR hiện trường được chỉ định. Hãy hỏi người phụ trách hiện trường để lấy liên kết QR mới nhất.",
    },
  },
};

export function getRiskShareCopy(locale: RiskShareLocale): RiskShareCopy {
  return COPY[locale];
}
