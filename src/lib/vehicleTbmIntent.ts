export type VehicleTbmIntent =
  | "vehicle-maintenance"
  | "driving-safety"
  | "vehicle-collision"
  | "traffic-separation"
  | "ambiguous"
  | "none";

export type VehicleTbmIntentResult = {
  intent: VehicleTbmIntent;
  label: string;
  isAmbiguous: boolean;
  detectedKeywords: string[];
  guidance: string;
};

const RULES: Array<{
  intent: VehicleTbmIntent;
  label: string;
  keywords: string[];
  guidance: string;
}> = [
  {
    intent: "vehicle-maintenance",
    label: "차량 상태점검",
    keywords: ["엔진오일", "오일", "브레이크", "타이어", "등화", "전조등", "후미등", "와이퍼", "냉각수", "배터리", "정비", "수리", "누유"],
    guidance: "차량 상태점검이면 차량 상태사진, 점검표, 타이어·등화·오일·누유 확인사진을 남기면 좋습니다.",
  },
  {
    intent: "driving-safety",
    label: "운행 전 안전점검",
    keywords: ["운행전", "운행 전", "출발전", "출발 전", "안전운전", "서행", "졸음", "음주", "시야확보", "안전벨트"],
    guidance: "운행 전 안전점검이면 서행, 시야확보, 운전자 상태, 출발 전 확인 내용을 TBM에 남기면 좋습니다.",
  },
  {
    intent: "vehicle-collision",
    label: "차량 후진·충돌 예방",
    keywords: ["후진", "충돌", "유도자", "신호수", "보행자", "후방", "사각지대"],
    guidance: "후진·충돌 예방이면 유도자 배치, 후방 확인, 보행자 통제, 차량 주변 사진을 남기면 좋습니다.",
  },
  {
    intent: "traffic-separation",
    label: "차량·보행자 동선 점검",
    keywords: ["동선", "동선분리", "동선 분리", "혼재", "보행통로", "통행로", "콘", "라인", "분리선"],
    guidance: "동선 점검이면 차량·보행자 동선, 콘·라인·표지판, 유도자 배치 상태를 남기면 좋습니다.",
  },
];

function normalize(text: string) {
  return (text ?? "").replace(/\s+/g, "").toLowerCase();
}

export function detectVehicleTbmIntent(text: string): VehicleTbmIntentResult {
  const normalized = normalize(text);

  const hasVehicle = normalized.includes("차량") || normalized.includes("자동차") || normalized.includes("운전");

  if (!hasVehicle) {
    return {
      intent: "none",
      label: "차량 관련 아님",
      isAmbiguous: false,
      detectedKeywords: [],
      guidance: "",
    };
  }

  const matches = RULES.map((rule) => {
    const detectedKeywords = rule.keywords.filter((keyword) =>
      normalized.includes(normalize(keyword))
    );

    return {
      ...rule,
      detectedKeywords,
    };
  }).filter((rule) => rule.detectedKeywords.length > 0);

  if (matches.length === 1) {
    const match = matches[0];

    return {
      intent: match.intent,
      label: match.label,
      isAmbiguous: false,
      detectedKeywords: match.detectedKeywords,
      guidance: match.guidance,
    };
  }

  if (matches.length > 1) {
    const detectedKeywords = Array.from(
      new Set(matches.flatMap((match) => match.detectedKeywords))
    );

    return {
      intent: "ambiguous",
      label: "차량점검 목적 구분 필요",
      isAmbiguous: true,
      detectedKeywords,
      guidance:
        "차량점검 내용이 여러 의미로 해석됩니다. 차량 상태점검, 운행 전 안전점검, 후진·충돌 예방, 동선 점검 중 어떤 내용인지 구체적으로 적어주세요.",
    };
  }

  if (
    normalized.includes("차량점검") ||
    normalized.includes("차량확인") ||
    normalized.includes("차량상태") ||
    normalized.includes("차량")
  ) {
    return {
      intent: "ambiguous",
      label: "차량점검 목적 구분 필요",
      isAmbiguous: true,
      detectedKeywords: ["차량"],
      guidance:
        "차량점검만으로는 정비상태 점검인지, 운행 전 안전점검인지, 후진·충돌 예방인지 구분하기 어렵습니다. 예: 출발 전 차량 안전점검, 후진 전 유도자 확인, 엔진오일 점검, 차량 동선 확인처럼 구체적으로 적어주세요.",
    };
  }

  return {
    intent: "none",
    label: "차량 관련 아님",
    isAmbiguous: false,
    detectedKeywords: [],
    guidance: "",
  };
}
