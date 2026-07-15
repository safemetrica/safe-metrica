import type { TenantSiteConfig } from "@/lib/supabaseServer";

export const SITE_NAME_MAX_LENGTH = 160;
export const INDUSTRY_PROFILE_MAX_LENGTH = 80;
export const WORKER_COUNT_BAND_MAX_LENGTH = 40;
export const PROFILE_LIST_MAX_ITEMS = 20;
export const PROFILE_LIST_ITEM_MAX_LENGTH = 80;

export type TenantSiteProfileInput = {
  siteName: unknown;
  industryProfile: unknown;
  majorProcesses: unknown;
  majorEquipment: unknown;
  workerCountBand: unknown;
  usesExternalWorkforce: unknown;
  hasWorkerRepresentative: unknown;
};

export type TenantSiteProfileFields = {
  siteName: string;
  industryProfile: string;
  majorProcesses: string[];
  majorEquipment: string[];
  workerCountBand: string;
  usesExternalWorkforce: boolean;
  hasWorkerRepresentative: boolean;
};

export type TenantSiteProfileFieldErrors = Partial<Record<keyof TenantSiteProfileFields, string>>;

export type TenantSiteProfileValidationResult =
  | { ok: true; value: TenantSiteProfileFields }
  | { ok: false; fieldErrors: TenantSiteProfileFieldErrors };

function toInputString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeProfileList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeProfileList(item));
  }

  const source = typeof value === "string" ? value : "";
  const seen = new Set<string>();
  const items: string[] = [];

  for (const rawItem of source.split(/[\n,，]+/u)) {
    const item = rawItem.trim();
    const key = item.toLocaleLowerCase("ko-KR");

    if (!item || seen.has(key)) {
      continue;
    }

    seen.add(key);
    items.push(item);
  }

  return items;
}

export function normalizeTriState(value: unknown): boolean | null {
  if (value === true || value === "yes") {
    return true;
  }

  if (value === false || value === "no") {
    return false;
  }

  return null;
}

function validateRequiredText(
  value: unknown,
  maxLength: number,
  requiredMessage: string,
  maxMessage: string,
): { value: string; error?: string } {
  const normalized = toInputString(value);

  if (!normalized) {
    return { value: normalized, error: requiredMessage };
  }

  if (normalized.length > maxLength) {
    return { value: normalized, error: maxMessage };
  }

  return { value: normalized };
}

function validateProfileList(value: unknown, requiredMessage: string): { value: string[]; error?: string } {
  const normalized = normalizeProfileList(value);

  if (normalized.length < 1) {
    return { value: normalized, error: requiredMessage };
  }

  if (normalized.length > PROFILE_LIST_MAX_ITEMS) {
    return { value: normalized, error: `최대 ${PROFILE_LIST_MAX_ITEMS}개까지 입력할 수 있습니다.` };
  }

  if (normalized.some((item) => item.length > PROFILE_LIST_ITEM_MAX_LENGTH)) {
    return { value: normalized, error: `각 항목은 ${PROFILE_LIST_ITEM_MAX_LENGTH}자 이내로 입력해 주세요.` };
  }

  return { value: normalized };
}

export function validateTenantSiteProfile(input: TenantSiteProfileInput): TenantSiteProfileValidationResult {
  const siteName = validateRequiredText(
    input.siteName,
    SITE_NAME_MAX_LENGTH,
    "사업장명을 입력해 주세요.",
    `사업장명은 ${SITE_NAME_MAX_LENGTH}자 이내로 입력해 주세요.`,
  );
  const industryProfile = validateRequiredText(
    input.industryProfile,
    INDUSTRY_PROFILE_MAX_LENGTH,
    "업종을 입력해 주세요.",
    `업종은 ${INDUSTRY_PROFILE_MAX_LENGTH}자 이내로 입력해 주세요.`,
  );
  const workerCountBand = validateRequiredText(
    input.workerCountBand,
    WORKER_COUNT_BAND_MAX_LENGTH,
    "근로자 규모를 입력해 주세요.",
    `근로자 규모는 ${WORKER_COUNT_BAND_MAX_LENGTH}자 이내로 입력해 주세요.`,
  );
  const majorProcesses = validateProfileList(input.majorProcesses, "주요 공정을 1개 이상 입력해 주세요.");
  const majorEquipment = validateProfileList(input.majorEquipment, "주요 설비를 1개 이상 입력해 주세요.");
  const usesExternalWorkforce = normalizeTriState(input.usesExternalWorkforce);
  const hasWorkerRepresentative = normalizeTriState(input.hasWorkerRepresentative);

  const fieldErrors: TenantSiteProfileFieldErrors = {};

  if (siteName.error) fieldErrors.siteName = siteName.error;
  if (industryProfile.error) fieldErrors.industryProfile = industryProfile.error;
  if (workerCountBand.error) fieldErrors.workerCountBand = workerCountBand.error;
  if (majorProcesses.error) fieldErrors.majorProcesses = majorProcesses.error;
  if (majorEquipment.error) fieldErrors.majorEquipment = majorEquipment.error;
  if (usesExternalWorkforce === null) fieldErrors.usesExternalWorkforce = "외부 인력 운영 여부를 선택해 주세요.";
  if (hasWorkerRepresentative === null) fieldErrors.hasWorkerRepresentative = "근로자대표 운영 여부를 선택해 주세요.";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      siteName: siteName.value,
      industryProfile: industryProfile.value,
      majorProcesses: majorProcesses.value,
      majorEquipment: majorEquipment.value,
      workerCountBand: workerCountBand.value,
      usesExternalWorkforce: usesExternalWorkforce as boolean,
      hasWorkerRepresentative: hasWorkerRepresentative as boolean,
    },
  };
}

export function isTenantSiteProfileComplete(site: Pick<TenantSiteConfig, "siteName" | "industryProfile" | "majorProcesses" | "majorEquipment" | "workerCountBand" | "usesExternalWorkforce" | "hasWorkerRepresentative"> | null | undefined): boolean {
  if (!site) {
    return false;
  }

  return validateTenantSiteProfile({
    siteName: site.siteName,
    industryProfile: site.industryProfile,
    majorProcesses: site.majorProcesses ?? "",
    majorEquipment: site.majorEquipment ?? "",
    workerCountBand: site.workerCountBand,
    usesExternalWorkforce: site.usesExternalWorkforce,
    hasWorkerRepresentative: site.hasWorkerRepresentative,
  }).ok;
}
