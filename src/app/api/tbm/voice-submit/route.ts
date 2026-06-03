import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { getCompanyConfig, TenantRequiredError, UnknownCompanyError } from "@/lib/company";
import { TBM_VOICE_UPLOAD_FIELD_KEYS } from "@/lib/tbmVoiceUploadFields";
import { detectTbmVoiceIntent } from "@/lib/tbmVoiceIntent";
import { normalizeTbmVoiceTranscript } from "@/lib/tbmVoiceTranscriptNormalize";
import {
  insertTbmVoiceSubmissionShadowRecord,
  isSupabaseTbmShadowWriteEnabled,
} from "@/lib/supabaseServer";

const SUPPORTED_COMPANY_CODES = new Set(["daedo", "bubblemon", "hankookgreen", "dongwoo"]);
const WASTE_COLLECTION_COMPANY_CODES = new Set(["daedo", "hankookgreen", "dongwoo"]);
const MAX_FILES_PER_GROUP = 6;
const MAX_SERVER_FILE_SIZE_BYTES = 8 * 1024 * 1024;

type UploadedTbmFile = {
  name: string;
  url: string;
};

type NotionPropertyMeta = {
  type?: string;
  select?: {
    options?: Array<{ name?: string }>;
  };
  multi_select?: {
    options?: Array<{ name?: string }>;
  };
};

type NotionPropertiesMeta = Record<string, NotionPropertyMeta | undefined>;

type NotionPropertyValue = Record<string, unknown>;

function getKstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function getTodayDateValue() {
  return getKstNow().toISOString().slice(0, 10);
}

function getTimeValue() {
  return getKstNow().toISOString().slice(11, 19);
}

function getFormText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isFile(value: FormDataEntryValue): value is File {
  return value instanceof File && value.size > 0;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^\w가-힣.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

function richText(content: string) {
  return {
    rich_text: [
      {
        text: {
          content: content.slice(0, 1900),
        },
      },
    ],
  };
}

function titleText(content: string) {
  return {
    title: [
      {
        text: {
          content: content.slice(0, 1900),
        },
      },
    ],
  };
}

function selectValue(name: string) {
  return {
    select: {
      name,
    },
  };
}

function multiSelectValue(names: string[]) {
  const uniqueNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean))).slice(0, 8);

  return {
    multi_select: uniqueNames.map((name) => ({ name })),
  };
}

function filesValue(files: UploadedTbmFile[]) {
  return {
    files: files.map((file) => ({
      name: file.name,
      external: {
        url: file.url,
      },
    })),
  };
}

function findProp(propertiesMeta: NotionPropertiesMeta, names: string[], type?: string) {
  return names.find((name) => {
    const prop = propertiesMeta[name];

    if (!prop) return false;
    if (!type) return true;

    return prop.type === type;
  });
}

function setIfProp(
  properties: Record<string, NotionPropertyValue>,
  propertiesMeta: NotionPropertiesMeta,
  names: string[],
  type: string,
  value: NotionPropertyValue
) {
  const propName = findProp(propertiesMeta, names, type);

  if (!propName) return undefined;

  properties[propName] = value;
  return propName;
}

function appendFilesIfProp(
  fileProperties: Map<string, UploadedTbmFile[]>,
  propertiesMeta: NotionPropertiesMeta,
  names: string[],
  files: UploadedTbmFile[]
) {
  if (files.length === 0) return undefined;

  const propName = findProp(propertiesMeta, names, "files");

  if (!propName) return undefined;

  fileProperties.set(propName, [...(fileProperties.get(propName) ?? []), ...files]);
  return propName;
}

function hasSelectOption(propertiesMeta: NotionPropertiesMeta, names: string[], optionName: string) {
  const propName = findProp(propertiesMeta, names, "select");
  const prop = propName ? propertiesMeta[propName] : undefined;

  if (!prop) return false;

  return Boolean(prop.select?.options?.some((option: { name?: string }) => option.name === optionName));
}


function getChoiceOptionNames(prop?: NotionPropertyMeta): string[] {
  if (!prop) return [];

  const optionNames =
    prop.type === "select"
      ? prop.select?.options?.map((option) => option.name)
      : prop.type === "multi_select"
        ? prop.multi_select?.options?.map((option) => option.name)
        : [];

  return (optionNames ?? []).filter((name): name is string => Boolean(name));
}

function normalizeChoiceName(name: string) {
  return name.replace(/[·ㆍ\-\s]+/g, "").trim().toLowerCase();
}

function matchExistingChoiceOption(candidates: string[], existingNames: string[]) {
  for (const candidate of candidates.map((name) => name.trim()).filter(Boolean)) {
    const exactMatch = existingNames.find((existingName) => existingName === candidate);

    if (exactMatch) return exactMatch;

    const normalizedCandidate = normalizeChoiceName(candidate);
    const normalizedMatch = existingNames.find((existingName) => normalizeChoiceName(existingName) === normalizedCandidate);

    if (normalizedMatch) return normalizedMatch;
  }

  return undefined;
}

function getWorkTypeCandidates(workType: string, workTypesMulti: string[], transcript: string, companyCode?: string) {
  const candidates: string[] = [];

  const addCandidate = (candidate: string) => {
    const trimmedCandidate = candidate.trim();

    if (trimmedCandidate && !candidates.includes(trimmedCandidate)) {
      candidates.push(trimmedCandidate);
    }
  };

  addCandidate(workType);
  workTypesMulti.forEach(addCandidate);

  if (hasWasteCollectionProfileSignal(transcript, companyCode)) {
    addCandidate("생활폐기물 수거");
    addCandidate("생활폐기물 수거·운반");
    addCandidate("생활폐기물 수거 운반");
    addCandidate("생활폐기물");
  }

  return candidates;
}

function setWorkTypeIfProp(
  properties: Record<string, NotionPropertyValue>,
  propertiesMeta: NotionPropertiesMeta,
  names: string[],
  workType: string,
  workTypesMulti: string[],
  transcript: string,
  companyCode?: string
) {
  const propName = findProp(propertiesMeta, names);
  const prop = propName ? propertiesMeta[propName] : undefined;

  if (!propName || !prop) return undefined;

  const candidates = getWorkTypeCandidates(workType, workTypesMulti, transcript, companyCode);

  if (candidates.length === 0) return undefined;

  const existingOptionNames = getChoiceOptionNames(prop);
  const representativeWorkType = matchExistingChoiceOption(candidates, existingOptionNames) ?? candidates[0];

  if (prop.type === "select") {
    properties[propName] = selectValue(representativeWorkType);
    return propName;
  }

  if (prop.type === "multi_select") {
    const multiCandidates = getWorkTypeCandidates(representativeWorkType, workTypesMulti, transcript, companyCode);
    const matchedNames = multiCandidates.map((candidate) => matchExistingChoiceOption([candidate], existingOptionNames) ?? candidate);

    properties[propName] = multiSelectValue(matchedNames);
    return propName;
  }

  return undefined;
}


function normalizeKoreanText(text: string) {
  return text.replace(/\s+/g, "");
}

function includesAny(text: string, keywords: string[]) {
  const raw = text;
  const compact = normalizeKoreanText(text);

  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeKoreanText(keyword);
    return raw.includes(keyword) || compact.includes(normalizedKeyword);
  });
}

function isWasteCollectionCompany(companyCode?: string) {
  return Boolean(companyCode && WASTE_COLLECTION_COMPANY_CODES.has(companyCode));
}

function hasWasteCollectionProfileSignal(text: string, companyCode?: string) {
  if (!isWasteCollectionCompany(companyCode)) return false;

  return includesAny(text, [
    "생활폐기물",
    "생활 폐기물",
    "수거",
    "운반",
    "종량제",
    "재활용",
    "음식물",
    "대형폐기물",
    "차량 후진",
    "후진",
    "후방카메라",
    "후진경보기",
    "유도자",
    "사각지대",
    "골목길",
    "좁은 골목",
    "보행자",
    "이면도로",
    "주택가",
    "적재함",
    "압축기",
    "압착",
    "압축진개차",
    "침출수",
    "새벽",
    "야간",
    "날카로운 폐기물",
    "찔림",
    "베임",
  ]);
}

function includesWasteCompanyExplicitWarehouseKeyword(text: string, companyCode?: string) {
  const keywords = isWasteCollectionCompany(companyCode)
    ? ["물류창고", "창고 입출고", "입출고", "입고", "출고", "창고", "보관", "재고", "피킹", "검수"]
    : ["물류업", "물류창고", "창고", "재고", "적재", "입출고", "입고", "출고"];

  return includesAny(text, keywords);
}

function includesWasteCompanyExplicitLoadingKeyword(text: string, companyCode?: string) {
  const keywords = isWasteCollectionCompany(companyCode)
    ? ["상하차", "상 하차", "상차", "하차", "하역"]
    : ["상하차", "상 하차", "상차", "하차", "싣", "내리", "적재", "하역"];

  return includesAny(text, keywords);
}

function inferWasteCollectionWorkTypes(text: string, companyCode?: string) {
  if (!hasWasteCollectionProfileSignal(text, companyCode)) return [];

  const types: string[] = ["생활폐기물 수거"];

  if (includesAny(text, ["차량 후진", "후진", "후방카메라", "후진경보기", "유도자", "사각지대"])) {
    types.push("차량 후진 작업");
  }

  if (includesAny(text, ["골목길", "좁은 골목", "보행자", "이면도로", "주택가"])) {
    types.push("골목길 수거");
  }

  if (includesAny(text, ["적재함", "압축기", "압착", "압축진개차", "덮개", "리프트"])) {
    types.push("적재함·압축기 작업");
  }

  if (includesAny(text, ["침출수", "우천", "비", "미끄럼", "바닥", "경사로"])) {
    types.push("우천·미끄럼 작업");
  }

  if (includesAny(text, ["새벽", "야간", "어두움", "시야", "전조등", "반사조끼"])) {
    types.push("야간·새벽작업");
  }

  if (includesAny(text, ["유리", "캔", "날카로운 폐기물", "찔림", "베임"])) {
    types.push("찔림·베임 위험");
  }

  if (includesAny(text, ["중량물", "무거운 봉투", "반복작업", "허리"])) {
    types.push("중량물 취급");
  }

  return types;
}

function inferWasteCollectionRiskTags(text: string, companyCode?: string) {
  if (!isWasteCollectionCompany(companyCode)) return [];

  const risks: string[] = [];

  if (includesAny(text, ["차량", "차량 후진", "후진", "골목길", "좁은 골목", "보행자", "이면도로", "주택가", "충돌"])) {
    risks.push("차량 충돌");
  }

  if (includesAny(text, ["차량 후진", "후진", "후방카메라", "후진경보기", "유도자"])) {
    risks.push("후진 충돌");
  }

  if (includesAny(text, ["사각지대", "후방카메라", "후진경보기", "유도자", "골목길", "좁은 골목"])) {
    risks.push("사각지대");
  }

  if (includesAny(text, ["적재함", "압축기", "압착", "압축진개차", "덮개", "리프트", "끼임", "협착"])) {
    risks.push("끼임·협착");
  }

  if (includesAny(text, ["침출수", "우천", "비", "미끄럼", "바닥", "경사로"])) {
    risks.push("미끄럼·전도");
  }

  if (includesAny(text, ["유리", "캔", "날카로운 폐기물", "찔림", "베임"])) {
    risks.push("찔림·베임");
  }

  if (includesAny(text, ["낙하", "맞음", "떨어짐", "덮개", "리프트", "대형폐기물"])) {
    risks.push("낙하·맞음");
  }

  if (includesAny(text, ["중량물", "무거운 봉투", "반복작업", "허리"])) {
    risks.push("중량물 부담");
  }

  if (includesAny(text, ["새벽", "야간", "어두움", "시야", "전조등", "반사조끼"])) {
    risks.push("야간 시야불량");
  }

  return risks;
}

function inferWorkTitle(transcript: string) {
  const text = transcript.replace(/\s+/g, " ").trim();

  if (includesAny(text, ["생활폐기물", "생활 폐기물", "수거", "운반", "골목"])) {
    return "생활폐기물 수거·운반 작업 전 TBM";
  }

  if (includesAny(text, ["지게차", "상하차", "적재", "하차"])) {
    return "지게차·상하차 작업 전 TBM";
  }

  if (includesAny(text, ["청소", "정비", "컨베이어", "끼임", "협착"])) {
    return "정비·청소 작업 전 TBM";
  }

  if (includesAny(text, ["용접", "화재", "불티"])) {
    return "화재위험 작업 전 TBM";
  }

  return "현장 작업 전 TBM";
}

function inferWorkType(transcript: string, companyCode?: string) {
  const text = transcript.replace(/\s+/g, " ");

  if (hasWasteCollectionProfileSignal(text, companyCode)) {
    return "생활폐기물 수거";
  }

  if (includesWasteCompanyExplicitLoadingKeyword(text, companyCode)) {
    return "상하차 작업";
  }

  if (includesWasteCompanyExplicitWarehouseKeyword(text, companyCode)) {
    return "창고 입출고";
  }

  if (includesAny(text, ["지게차", "좁은 동선", "이동 동선", "통로"])) {
    return "지게차 작업";
  }

  if (includesAny(text, ["차량", "후진", "운전", "서행", "후방카메라"])) {
    return "차량 점검";
  }

  if (includesAny(text, ["정비", "설비", "컨베이어", "청소", "수리", "보수"])) {
    return "정비점검";
  }

  if (includesAny(text, ["우천", "비", "미끄럼", "침출수"])) {
    return "우천 작업";
  }

  return "기타";
}

function inferWorkTypesMulti(transcript: string, companyCode?: string) {
  const text = transcript.replace(/\s+/g, " ");
  const wasteCollectionTypes = inferWasteCollectionWorkTypes(text, companyCode);

  if (wasteCollectionTypes.length > 0) {
    return Array.from(new Set(wasteCollectionTypes));
  }

  const types: string[] = [];

  if (includesWasteCompanyExplicitLoadingKeyword(text, companyCode)) {
    types.push("상하차");
  }

  if (includesWasteCompanyExplicitWarehouseKeyword(text, companyCode)) {
    types.push("창고 입출고");
  }

  if (includesAny(text, ["포장", "랩핑", "박스", "패킹", "봉합", "테이핑"])) {
    types.push("포장작업");
  }

  if (includesAny(text, ["지게차", "포크리프트", "forklift", "좁은 동선", "이동 동선", "통로", "충돌 위험"])) {
    types.push("지게차 작업");
  }

  if (includesAny(text, ["파렛트", "팔레트", "pallet", "빠레트", "파레트"])) {
    types.push("파렛트 작업");
  }

  if (includesAny(text, ["랙", "높은 곳", "고소대", "고소작업", "고소 작업", "추락", "낙상"])) {
    types.push("고소작업");
  }

  if (includesAny(text, ["전자담배", "배터리", "충전", "발열", "화재예방", "화재 예방", "화재", "폭발"])) {
    types.push("화재위험 작업");
  }

  if (includesAny(text, ["여름", "여름철", "온열질환", "폭염", "더위", "수분", "휴식"])) {
    types.push("폭염작업");
  }

  if (includesAny(text, ["생활폐기물", "생활 폐기물", "수거", "운반", "골목"])) {
    types.push("생활폐기물 수거");
  }

  if (includesAny(text, ["차량", "후진", "운전", "서행", "후방카메라"])) {
    types.push("차량 작업");
  }

  if (includesAny(text, ["정비", "설비", "컨베이어", "청소", "수리", "보수"])) {
    types.push("정비점검");
  }

  if (includesAny(text, ["우천", "비", "미끄럼", "침출수"])) {
    types.push("우천 작업");
  }

  return Array.from(new Set(types));
}

function inferRiskTags(transcript: string, companyCode?: string) {
  const text = transcript.replace(/\s+/g, " ");
  const wasteCollectionRisks = inferWasteCollectionRiskTags(text, companyCode);

  if (hasWasteCollectionProfileSignal(text, companyCode)) {
    return wasteCollectionRisks.length > 0 ? Array.from(new Set(wasteCollectionRisks)) : ["작업 전 안전확인"];
  }

  const risks: string[] = [];

  if (includesAny(text, ["차량", "후진", "운전", "골목", "서행", "카메라"])) {
    risks.push("차량 충돌", "후진 충돌", "사각지대");
  }

  if (includesAny(text, ["지게차", "상하차", "적재", "하차", "물류창고", "좁은 동선", "이동 동선", "통로", "충돌 위험"])) {
    risks.push("지게차 충돌");
  }

  if (includesAny(text, ["낙하", "맞음", "상하차", "하차"])) {
    risks.push("낙하·맞음");
  }

  if (includesAny(text, ["끼임", "협착", "압착"])) {
    risks.push("끼임·협착");
  }

  if (includesAny(text, ["찔림", "베임"])) {
    risks.push("찔림·베임");
  }

  if (includesAny(text, ["미끄럼", "침출수", "바닥", "우천", "비"])) {
    risks.push("미끄럼·전도");
  }

  if (includesAny(text, ["화재", "화재예방", "화재 예방", "용접", "불티", "전자담배", "배터리", "충전", "발열", "폭발"])) {
    risks.push("화재·폭발");
  }

  if (includesAny(text, ["추락", "낙상", "고소", "고소대", "고소작업", "고소 작업", "사다리", "계단", "랙", "높은 곳"])) {
    risks.push("추락");
  }

  if (includesAny(text, ["여름", "여름철", "온열질환", "폭염", "더위", "수분", "휴식"])) {
    risks.push("온열질환");
  }

  if (risks.length === 0) {
    risks.push("작업 전 안전확인");
  }

  return Array.from(new Set(risks));
}

function inferWorkTags(transcript: string, companyCode?: string) {
  const text = transcript.replace(/\s+/g, " ");
  const tags: string[] = [];

  if (hasWasteCollectionProfileSignal(text, companyCode)) {
    tags.push("생활폐기물");
    if (includesAny(text, ["차량 후진", "후진", "후방카메라", "후진경보기", "유도자", "사각지대"])) tags.push("차량 후진");
    if (includesAny(text, ["골목길", "좁은 골목", "보행자", "이면도로", "주택가"])) tags.push("골목길 수거");
    if (includesAny(text, ["적재함", "압축기", "압착", "압축진개차", "덮개", "리프트"])) tags.push("적재함·압축기");
    if (includesAny(text, ["새벽", "야간", "어두움", "시야", "전조등", "반사조끼"])) tags.push("야간·새벽작업");
    if (includesAny(text, ["중량물", "무거운 봉투", "반복작업", "허리"])) tags.push("중량물 취급");
    if (includesAny(text, ["끼임", "협착", "찔림", "베임"])) tags.push("협착·베임");
    if (includesAny(text, ["사진", "증빙", "확인"])) tags.push("사진증빙");

    return Array.from(new Set(tags));
  }

  if (includesAny(text, ["생활폐기물", "생활 폐기물", "수거", "운반", "종량제", "재활용", "음식물", "대형폐기물"])) tags.push("생활폐기물");
  if (includesAny(text, ["차량", "후진", "운전", "서행"])) tags.push("차량작업");
  if (includesWasteCompanyExplicitWarehouseKeyword(text, companyCode)) tags.push("창고 입출고");
  if (includesAny(text, ["지게차", "상하차", "좁은 동선", "이동 동선", "통로"])) tags.push("지게차");
  if (includesAny(text, ["끼임", "협착", "찔림", "베임"])) tags.push("협착·베임");
  if (includesAny(text, ["랙", "높은 곳", "고소대", "고소작업", "고소 작업", "추락", "낙상"])) tags.push("고소작업");
  if (includesAny(text, ["전자담배", "배터리", "충전", "발열", "화재예방", "화재 예방", "화재", "폭발"])) tags.push("화재·폭발");
  if (includesAny(text, ["여름", "여름철", "온열질환", "폭염", "더위", "수분", "휴식"])) tags.push("온열질환");
  if (includesAny(text, ["사진", "증빙", "확인"])) tags.push("사진증빙");

  if (tags.length === 0) tags.push("일반 TBM");

  return tags;
}

function buildSafetyNotice(transcript: string, companyCode?: string) {
  const risks = inferRiskTags(transcript, companyCode);
  const lines: string[] = [];

  lines.push("[음성 TBM 직접저장]");
  lines.push("");
  lines.push("[작업 내용]");
  lines.push(transcript || "작업 전 TBM 내용을 음성으로 작성했습니다.");
  lines.push("");
  lines.push("[오늘의 핵심 위험요인]");
  risks.forEach((risk) => lines.push(`- ${risk}`));
  lines.push("");
  lines.push("[근로자 주의사항]");
  lines.push("- 작업 전 보호구 착용상태를 확인합니다.");
  lines.push("- 차량·장비 이동 전 주변 작업자와 보행자 접근 여부를 확인합니다.");
  lines.push("- 이상 상황, 아차사고, 추가 위험요인은 즉시 현장관리자에게 공유합니다.");

  return lines.join("\n");
}


function stripTbmListMarker(line: string) {
  return line.replace(/^[-•*]\s*/, "").trim();
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractTbmSection(text: string, sectionTitle: string) {
  const lines = text.split(/\r?\n/);
  const titlePattern = new RegExp(`^\\s*(?:\\d+\\.\\s*)?${escapeRegExp(sectionTitle)}`);
  const nextSectionPattern = /^\s*\d+\.\s+/;
  const startIndex = lines.findIndex((line) => titlePattern.test(line.trim()));

  if (startIndex < 0) return "";

  const sectionLines: string[] = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (nextSectionPattern.test(line.trim())) break;

    sectionLines.push(line);
  }

  return sectionLines.map(stripTbmListMarker).join("\n").trim();
}

function normalizeSpecialIssueText(text: string) {
  return text
    .split(/\r?\n/)
    .map(stripTbmListMarker)
    .join("\n")
    .replace(/[\s.,，。!！?？:：;；()\[\]{}'"“”‘’]+/g, "")
    .trim();
}

function isDefaultSpecialIssueText(text: string) {
  const normalizedText = normalizeSpecialIssueText(text);
  const defaultTexts = new Set([
    "현장에서확인후필요시조치사항을추가입력합니다",
    "특이사항없음",
    "특이사항은없습니다",
    "이상없음",
    "해당없음",
    "없음",
  ]);

  if (!normalizedText) return true;
  if (defaultTexts.has(normalizedText)) return true;

  const normalizedLines = text
    .split(/\r?\n/)
    .map(normalizeSpecialIssueText)
    .filter(Boolean);

  return normalizedLines.length > 0 && normalizedLines.every((line) => defaultTexts.has(line));
}

function analyzeTbmSpecialIssue(text: string) {
  const sectionText = extractTbmSection(text, "특이사항/조치 필요");
  const targetText = sectionText || text;
  const realIssueKeywords = [
    "아차사고",
    "사고 발생",
    "고장",
    "고장 발생",
    "파손",
    "누유",
    "미끄럼 발생",
    "보호구 미착용",
    "작업 중단",
    "위험요인 발견",
    "누락",
    "불량",
    "미흡",
    "현장 발견",
    "이상 발생",
    "현장 확인 필요",
    "조치 필요",
    "추가 조치 필요",
    "보완 필요",
  ];
  const actionRequiredKeywords = [
    "조치 필요",
    "추가 조치 필요",
    "현장 확인 필요",
    "보완 필요",
    "작업 중단",
    "위험요인 발견",
    "사고 발생",
    "고장",
    "파손",
    "누유",
    "미끄럼 발생",
    "보호구 미착용",
  ];

  if (isDefaultSpecialIssueText(targetText)) {
    return {
      hasSpecialIssue: false,
      content: "특이사항 없음",
      needsAction: false,
    };
  }

  const hasRealIssueKeyword = includesAny(targetText, realIssueKeywords);
  const hasNoIssuePhrase = includesAny(targetText, ["특이사항 없음", "특이사항은 없습니다", "이상 없음", "해당 없음", "없음"]);
  const hasSpecialIssue = sectionText ? Boolean(targetText.trim()) || hasRealIssueKeyword : hasRealIssueKeyword && !hasNoIssuePhrase;
  const needsAction = hasSpecialIssue && includesAny(targetText, actionRequiredKeywords);

  return {
    hasSpecialIssue,
    content: hasSpecialIssue ? targetText.trim() : "특이사항 없음",
    needsAction,
  };
}

async function uploadFiles(files: File[], companyCode: string, dateValue: string, group: string) {
  const uploadedFiles: UploadedTbmFile[] = [];

  if (!process.env.BLOB_READ_WRITE_TOKEN || files.length === 0) {
    return uploadedFiles;
  }

  for (const file of files.slice(0, MAX_FILES_PER_GROUP)) {
    const fileName = sanitizeFileName(file.name || `${group}.jpg`);
    const path = `tbm/${companyCode}/${dateValue}/${group}/${Date.now()}-${fileName}`;

    const blob = await put(path, file, {
      access: "public",
      addRandomSuffix: true,
    });

    uploadedFiles.push({
      name: fileName,
      url: blob.url,
    });
  }

  return uploadedFiles;
}

function collectFiles(formData: FormData, key: string) {
  return formData.getAll(key).filter(isFile);
}

function validateFileSize(fileGroups: File[][]) {
  for (const files of fileGroups) {
    const oversized = files.find((file) => file.size > MAX_SERVER_FILE_SIZE_BYTES);

    if (oversized) {
      return false;
    }
  }

  return true;
}

async function getTbmDbProperties(notionApiKey: string, tbmDbId: string): Promise<NotionPropertiesMeta> {
  const res = await fetch(`https://api.notion.com/v1/databases/${tbmDbId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? "TBM database metadata failed");
  }

  const data = await res.json();
  return data?.properties ?? {};
}

export async function POST(req: NextRequest) {
  let company;

  try {
    company = await getCompanyConfig();
  } catch (error) {
    if (error instanceof TenantRequiredError) {
      return NextResponse.json(
        { ok: false, error: "tenant_required", message: "업체 홈 접속 후 다시 시도하세요." },
        { status: 401 }
      );
    }

    if (error instanceof UnknownCompanyError) {
      return NextResponse.json(
        { ok: false, error: "unknown_company", message: "업체 정보를 확인할 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "company_error", message: "업체 설정 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  if (!SUPPORTED_COMPANY_CODES.has(company.code)) {
    return NextResponse.json(
      { ok: false, error: "unsupported_company", message: "현재 TBM 음성 직접저장은 정식 운영 4개사만 지원합니다." },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const transcript = getFormText(formData, "transcript");
  const draftText = getFormText(formData, "draftText");
  const editedDraftText = getFormText(formData, "editedDraftText");
  const supervisorName = getFormText(formData, "supervisorName") || (company.code === "daedo" ? "김인길" : "현장관리자");

  const signatureFiles = collectFiles(formData, TBM_VOICE_UPLOAD_FIELD_KEYS.signature);
  const siteFiles = collectFiles(formData, TBM_VOICE_UPLOAD_FIELD_KEYS.site);
  const workFiles = collectFiles(formData, TBM_VOICE_UPLOAD_FIELD_KEYS.work);
  const actionFiles = collectFiles(formData, TBM_VOICE_UPLOAD_FIELD_KEYS.action);

  if (!transcript && !draftText) {
    return NextResponse.json(
      { ok: false, error: "missing_content", message: "음성 인식 내용이 없습니다." },
      { status: 400 }
    );
  }

  if (!validateFileSize([signatureFiles, siteFiles, workFiles, actionFiles])) {
    return NextResponse.json(
      { ok: false, error: "file_too_large", message: "사진 1장당 8MB 이하로 첨부해 주세요." },
      { status: 413 }
    );
  }

  const notionApiKey = company.notionApiKey || process.env.NOTION_API_KEY;

  if (!notionApiKey || !company.tbmDbId) {
    return NextResponse.json(
      { ok: false, error: "missing_tbm_config", message: "TBM 저장 DB 설정을 확인해 주세요." },
      { status: 500 }
    );
  }

  const dateValue = getTodayDateValue();
  const startTime = getFormText(formData, "startTime") || getTimeValue();
  const endTime = getTimeValue();
  const mainText = editedDraftText || draftText || transcript;
  const normalizedText = normalizeTbmVoiceTranscript(mainText);

  const selectedFileCount =
    signatureFiles.length + siteFiles.length + workFiles.length + actionFiles.length;

  if (selectedFileCount > 0 && !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "missing_blob_token", message: "사진 저장 설정이 없습니다. BLOB_READ_WRITE_TOKEN을 확인해 주세요." },
      { status: 500 }
    );
  }

  let uploadedSignatureFiles: UploadedTbmFile[] = [];
  let uploadedSiteFiles: UploadedTbmFile[] = [];
  let uploadedWorkFiles: UploadedTbmFile[] = [];
  let uploadedActionFiles: UploadedTbmFile[] = [];

  try {
    [uploadedSignatureFiles, uploadedSiteFiles, uploadedWorkFiles, uploadedActionFiles] = await Promise.all([
      uploadFiles(signatureFiles, company.code, dateValue, "signature"),
      uploadFiles(siteFiles, company.code, dateValue, "site"),
      uploadFiles(workFiles, company.code, dateValue, "work"),
      uploadFiles(actionFiles, company.code, dateValue, "action"),
    ]);
  } catch {
    return NextResponse.json(
      { ok: false, error: "file_upload_error", message: "사진 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  let meta: NotionPropertiesMeta;

  try {
    meta = await getTbmDbProperties(notionApiKey, company.tbmDbId);
  } catch {
    return NextResponse.json(
      { ok: false, error: "notion_meta_error", message: "TBM DB 속성 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  const voiceIntent = detectTbmVoiceIntent(mainText);
  const isSafetyPolicyIntent = voiceIntent === "safety_policy";
  const shouldSetWorkType = ["work_tbm", "inspection", "maintenance", "action_completed"].includes(voiceIntent);
  const title = isSafetyPolicyIntent ? "안전보건경영방침 공유" : inferWorkTitle(normalizedText);
  const safetyNotice = buildSafetyNotice(normalizedText, company.code);
  const specialIssueAnalysis = isSafetyPolicyIntent
    ? { hasSpecialIssue: false, content: "특이사항 없음", needsAction: false }
    : analyzeTbmSpecialIssue(mainText);
  const hasSpecialIssue = specialIssueAnalysis.hasSpecialIssue;
  const workType = inferWorkType(normalizedText, company.code);
  const workTypesMulti = isSafetyPolicyIntent ? [] : inferWorkTypesMulti(normalizedText, company.code);
  const workTags = isSafetyPolicyIntent
    ? ["안전보건방침", "경영방침 공유", "근로자 공유"]
    : inferWorkTags(normalizedText, company.code);
  const riskTags = isSafetyPolicyIntent ? ["안전보건관리체계"] : inferRiskTags(normalizedText, company.code);

  const workTypePropNames = ["작업 유형", "작업유형"];
  const workTypesMultiPropNames = ["작업유형(복수)", "작업 유형(복수)", "작업유형복수"];
  const workTagPropNames = ["작업 태그", "작업태그"];
  const riskTagPropNames = ["핵심 위험요인", "핵심위험요인"];
  const safetyNoticePropNames = ["오늘의 주의사항", "오늘주의사항", "오늘 주의사항"];
  const specialIssueContentPropNames = ["특이사항 내용", "특이사항내용"];
  const actionStatusPropNames = ["조치 상태", "조치상태"];
  const signaturePhotoPropNames = ["서명 사진 (참석자 확인)", "참석서명", "참석 서명", "서명사진"];
  const sitePhotoPropNames = ["현장 사진", "작업 전 현장사진", "사진"];
  const workPhotoPropNames = ["파일과 미디어", "작업사진", "작업 사진", "사진"];
  const actionPhotoPropNames = ["조치 사진", "조치사진", "특이사항·조치사진"];

  const properties: Record<string, NotionPropertyValue> = {};

  setIfProp(properties, meta, ["작업명"], "title", titleText(title));
  setIfProp(properties, meta, ["날짜"], "date", { date: { start: dateValue } });
  setIfProp(properties, meta, ["시작시간"], "rich_text", richText(startTime));
  setIfProp(properties, meta, ["종료시간"], "rich_text", richText(endTime));
  if (shouldSetWorkType) {
    setWorkTypeIfProp(properties, meta, workTypePropNames, workType, workTypesMulti, normalizedText, company.code);

    const multiWorkTypes = workTypesMulti.length > 0 ? workTypesMulti : [workType];
    setIfProp(properties, meta, workTypesMultiPropNames, "multi_select", multiSelectValue(multiWorkTypes));
  }
  setIfProp(properties, meta, workTagPropNames, "multi_select", multiSelectValue(workTags));
  setIfProp(properties, meta, riskTagPropNames, "multi_select", multiSelectValue(riskTags));
  setIfProp(properties, meta, safetyNoticePropNames, "rich_text", richText(safetyNotice));
  setIfProp(properties, meta, ["특이사항"], "checkbox", { checkbox: hasSpecialIssue });
  setIfProp(
    properties,
    meta,
    specialIssueContentPropNames,
    "rich_text",
    richText(specialIssueAnalysis.content)
  );

  if (isSafetyPolicyIntent) {
    if (hasSelectOption(meta, actionStatusPropNames, "조치 불필요")) {
      setIfProp(properties, meta, actionStatusPropNames, "select", selectValue("조치 불필요"));
    }
  } else {
    setIfProp(properties, meta, actionStatusPropNames, "select", selectValue(specialIssueAnalysis.needsAction ? "조치 필요" : "해당 없음"));
  }

  setIfProp(properties, meta, ["실시자(현장총괄)"], "select", selectValue(supervisorName));

  const fileProperties = new Map<string, UploadedTbmFile[]>();

  appendFilesIfProp(fileProperties, meta, signaturePhotoPropNames, uploadedSignatureFiles);
  appendFilesIfProp(fileProperties, meta, sitePhotoPropNames, uploadedSiteFiles);
  appendFilesIfProp(fileProperties, meta, workPhotoPropNames, uploadedWorkFiles);
  appendFilesIfProp(fileProperties, meta, actionPhotoPropNames, uploadedActionFiles);

  for (const [propName, files] of fileProperties) {
    properties[propName] = filesValue(files);
  }

  const createRes = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: {
        database_id: company.tbmDbId,
      },
      properties,
    }),
  });

  const createData = await createRes.json();

  if (!createRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "notion_create_error",
        message: createData?.message ?? "TBM 저장 중 Notion 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }

  const uploadedFileCount =
    uploadedSignatureFiles.length + uploadedSiteFiles.length + uploadedWorkFiles.length + uploadedActionFiles.length;
  const supabaseShadowWriteEnabled = isSupabaseTbmShadowWriteEnabled(company.code);

  console.log("[tbm-voice-submit] supabase shadow-write check", {
    companyCode: company.code,
    enabledEnv: process.env.SUPABASE_TBM_SHADOW_WRITE_ENABLED,
    companiesEnvExists: Boolean(process.env.SUPABASE_TBM_SHADOW_WRITE_COMPANIES),
    isEnabled: supabaseShadowWriteEnabled,
  });

  if (supabaseShadowWriteEnabled) {
    const actionStatus = isSafetyPolicyIntent ? "조치 불필요" : hasSpecialIssue ? "조치 필요" : "해당 없음";
    const uploadedFiles = {
      signature: uploadedSignatureFiles,
      site: uploadedSiteFiles,
      work: uploadedWorkFiles,
      action: uploadedActionFiles,
    };
    const notionPageId = createData?.id ?? null;
    const notionPageUrl = createData?.url ?? null;
    const snapshot = {
      notion: {
        databaseId: company.tbmDbId,
        pageId: notionPageId,
        pageUrl: notionPageUrl,
        properties,
      },
      calculations: {
        dateValue,
        startTime,
        endTime,
        voiceIntent,
        title,
        safetyNotice,
        hasSpecialIssue,
        actionStatus,
        supervisorName,
        workType,
        workTypes: workTypesMulti,
        workTags,
        riskTags,
        selectedFileCount,
        uploadedFileCount,
      },
      uploadedFiles,
    };

    try {
      console.log("[tbm-voice-submit] supabase shadow-write start", {
        companyCode: company.code,
        notionPageId,
        uploadedFileCount,
      });

      const shadowWriteResult = await insertTbmVoiceSubmissionShadowRecord({
        company_code: company.code,
        company_name: company.name,
        notion_tbm_db_id: company.tbmDbId,
        notion_page_id: notionPageId,
        notion_page_url: notionPageUrl,
        date_value: dateValue,
        start_time: startTime,
        end_time: endTime,
        voice_intent: voiceIntent,
        title,
        transcript,
        draft_text: draftText,
        main_text: mainText,
        normalized_text: normalizedText,
        supervisor_name: supervisorName,
        work_type: workType,
        work_types: workTypesMulti,
        work_tags: workTags,
        risk_tags: riskTags,
        safety_notice: safetyNotice,
        has_special_issue: hasSpecialIssue,
        special_issue_content: hasSpecialIssue ? mainText : "특이사항 없음",
        action_status: actionStatus,
        selected_file_count: selectedFileCount,
        uploaded_file_count: uploadedFileCount,
        uploaded_files: uploadedFiles,
        notion_properties_snapshot: properties,
        snapshot,
      });

      if (!shadowWriteResult.ok) {
        console.error("Supabase TBM shadow-write failed", {
          companyCode: company.code,
          notionPageId,
          status: shadowWriteResult.status,
          statusText: shadowWriteResult.statusText,
          message: shadowWriteResult.message,
        });
      } else {
        console.log("[tbm-voice-submit] supabase shadow-write success", {
          companyCode: company.code,
          notionPageId,
        });
      }
    } catch (error) {
      console.error("Supabase TBM shadow-write failed", {
        companyCode: company.code,
        notionPageId,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    pageId: createData?.id,
    uploadedFileCount,
    message: uploadedFileCount > 0 ? "TBM 내용과 사진이 기존 양식에 맞게 저장되었습니다." : "TBM 내용이 기존 양식에 맞게 저장되었습니다.",
  });
}
