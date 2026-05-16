export type VisionEvidenceObject =
  | "vehicle"
  | "truckBed"
  | "coverClosed"
  | "coverOpen"
  | "crack"
  | "reinforcement"
  | "trafficCone"
  | "flagger"
  | "trafficControl"
  | "ppe"
  | "workArea"
  | "beforeState"
  | "afterState"
  | "unknown";

export type PhotoVisionFinding = {
  photoField: string;
  objects: VisionEvidenceObject[];
  confidence: "높음" | "중간" | "낮음";
  note: string;
};

export type VisionEvidenceSummary = {
  hasVehicle: boolean;
  hasTruckBed: boolean;
  hasCoverClosed: boolean;
  hasCrack: boolean;
  hasReinforcement: boolean;
  hasTrafficControl: boolean;
  hasPpe: boolean;
  hasWorkArea: boolean;
  canCountAsWorkTargetPhoto: boolean;
  canCountAsActionPhoto: boolean;
  findings: PhotoVisionFinding[];
};

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function inferVisionEvidenceFromPhotoFields(props: any): VisionEvidenceSummary {
  const findings: PhotoVisionFinding[] = [];

  for (const [fieldName, prop] of Object.entries(props) as any) {
    const files = prop?.files;
    if (!Array.isArray(files) || files.length === 0) continue;

    const normalized = fieldName.replace(/\s+/g, "").toLowerCase();
    const objects: VisionEvidenceObject[] = [];

    if (includesAny(normalized, ["차량", "차", "트럭", "운행", "적재"])) {
      objects.push("vehicle");
    }

    if (includesAny(normalized, ["적재함", "덮개", "상차", "하차"])) {
      objects.push("truckBed");
    }

    if (includesAny(normalized, ["닫힘", "닫음", "체결", "덮개"])) {
      objects.push("coverClosed");
    }

    if (includesAny(normalized, ["균열", "크랙", "축대", "붕괴", "옹벽"])) {
      objects.push("crack");
      objects.push("workArea");
    }

    if (includesAny(normalized, ["보강", "보수", "완료", "조치", "개선"])) {
      objects.push("reinforcement");
      objects.push("afterState");
    }

    if (includesAny(normalized, ["콘", "라바콘", "라인", "유도자", "신호수", "통제"])) {
      objects.push("trafficCone");
      objects.push("trafficControl" as VisionEvidenceObject);
    }

    if (includesAny(normalized, ["보호구", "안전모", "조끼", "ppe", "반사"])) {
      objects.push("ppe");
    }

    if (includesAny(normalized, ["현장", "작업대상", "대상", "위치", "상태"])) {
      objects.push("workArea");
    }

    findings.push({
      photoField: fieldName,
      objects: Array.from(new Set(objects.length > 0 ? objects : ["unknown"])),
      confidence: objects.length > 0 ? "중간" : "낮음",
      note:
        objects.length > 0
          ? "사진 필드명 기준으로 사진 속 대상을 추정했습니다. 향후 실제 이미지 AI 판별로 보완합니다."
          : "사진 필드명만으로는 대상을 명확히 알기 어렵습니다.",
    });
  }

  const allObjects = findings.flatMap((finding) => finding.objects);

  const hasVehicle = allObjects.includes("vehicle");
  const hasTruckBed = allObjects.includes("truckBed");
  const hasCoverClosed = allObjects.includes("coverClosed");
  const hasCrack = allObjects.includes("crack");
  const hasReinforcement = allObjects.includes("reinforcement");
  const hasTrafficControl =
    allObjects.includes("trafficCone") || allObjects.includes("flagger");
  const hasPpe = allObjects.includes("ppe");
  const hasWorkArea = allObjects.includes("workArea");

  return {
    hasVehicle,
    hasTruckBed,
    hasCoverClosed,
    hasCrack,
    hasReinforcement,
    hasTrafficControl,
    hasPpe,
    hasWorkArea,
    canCountAsWorkTargetPhoto:
      hasVehicle || hasTruckBed || hasCrack || hasWorkArea,
    canCountAsActionPhoto:
      hasCoverClosed || hasReinforcement || hasTrafficControl || hasPpe,
    findings,
  };
}
