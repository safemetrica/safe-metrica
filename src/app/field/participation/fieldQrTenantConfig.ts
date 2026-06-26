import type {
  FieldQrMode,
  FieldQrModePolicy,
  FieldQrTenantCode,
  FieldQrTenantConfig,
} from "./fieldQrCoreTypes";

const FIELD_QR_MODES: FieldQrMode[] = [
  "monthly_risk_share_confirmation",
  "daily_prework_safety_check",
  "anonymous_feedback",
  "visitor_safety_confirmation",
];

type CreateTenantConfigInput = {
  tenantCode: FieldQrTenantCode;
  legacyMode: boolean;
  displayName: string;
  industryProfile: string;
  enabledModes?: FieldQrMode[];
  rememberInfoEnabled?: boolean;
  signatureRequiredModes?: Partial<Record<FieldQrMode, boolean>>;
};

function createModePolicies({
  enabledModes = ["monthly_risk_share_confirmation"],
  rememberInfoEnabled = false,
  signatureRequiredModes = {},
}: Pick<
  CreateTenantConfigInput,
  "enabledModes" | "rememberInfoEnabled" | "signatureRequiredModes"
>): Record<FieldQrMode, FieldQrModePolicy> {
  const isEnabled = (mode: FieldQrMode) => enabledModes.includes(mode);
  const hasRememberInfo = (mode: FieldQrMode) =>
    rememberInfoEnabled &&
    (mode === "monthly_risk_share_confirmation" ||
      mode === "daily_prework_safety_check");

  return {
    monthly_risk_share_confirmation: {
      mode: "monthly_risk_share_confirmation",
      enabled: isEnabled("monthly_risk_share_confirmation"),
      cadence: "monthly",
      identityRequired: true,
      signatureRequired:
        signatureRequiredModes.monthly_risk_share_confirmation ?? false,
      rememberInfoEnabled: hasRememberInfo("monthly_risk_share_confirmation"),
      riskSummaryRequired: true,
      anonymous: false,
    },
    daily_prework_safety_check: {
      mode: "daily_prework_safety_check",
      enabled: isEnabled("daily_prework_safety_check"),
      cadence: "daily",
      identityRequired: true,
      signatureRequired: signatureRequiredModes.daily_prework_safety_check ?? false,
      rememberInfoEnabled: hasRememberInfo("daily_prework_safety_check"),
      riskSummaryRequired: false,
      anonymous: false,
    },
    anonymous_feedback: {
      mode: "anonymous_feedback",
      enabled: isEnabled("anonymous_feedback"),
      cadence: "event",
      identityRequired: false,
      signatureRequired: false,
      rememberInfoEnabled: false,
      riskSummaryRequired: false,
      anonymous: true,
    },
    visitor_safety_confirmation: {
      mode: "visitor_safety_confirmation",
      enabled: isEnabled("visitor_safety_confirmation"),
      cadence: "event",
      identityRequired: true,
      signatureRequired: signatureRequiredModes.visitor_safety_confirmation ?? false,
      rememberInfoEnabled: false,
      riskSummaryRequired: false,
      anonymous: false,
    },
  };
}

function createTenantConfig(input: CreateTenantConfigInput): FieldQrTenantConfig {
  const enabledModes = input.enabledModes ?? ["monthly_risk_share_confirmation"];

  return {
    tenantCode: input.tenantCode,
    legacyMode: input.legacyMode,
    displayName: input.displayName,
    industryProfile: input.industryProfile,
    enabledModes,
    modePolicies: createModePolicies({
      enabledModes,
      rememberInfoEnabled: input.rememberInfoEnabled ?? false,
      signatureRequiredModes: input.signatureRequiredModes,
    }),
    rememberInfoEnabled: input.rememberInfoEnabled ?? false,
  };
}

const FIELD_QR_TENANT_CONFIGS: Record<FieldQrTenantCode, FieldQrTenantConfig> = {
  daedo: createTenantConfig({
    tenantCode: "daedo",
    legacyMode: true,
    displayName: "대도",
    industryProfile: "environmental-services",
  }),
  dongwoo: createTenantConfig({
    tenantCode: "dongwoo",
    legacyMode: true,
    displayName: "동우",
    industryProfile: "environmental-services",
  }),
  hankookgreen: createTenantConfig({
    tenantCode: "hankookgreen",
    legacyMode: true,
    displayName: "한국그린",
    industryProfile: "environmental-services",
  }),
  bubblemon: createTenantConfig({
    tenantCode: "bubblemon",
    legacyMode: true,
    displayName: "버블몬",
    industryProfile: "logistics-warehouse",
    enabledModes: FIELD_QR_MODES,
    rememberInfoEnabled: true,
  }),
  richi: createTenantConfig({
    tenantCode: "richi",
    legacyMode: false,
    displayName: "리치",
    industryProfile: "food-factory",
    enabledModes: FIELD_QR_MODES,
    rememberInfoEnabled: true,
    signatureRequiredModes: {
      daily_prework_safety_check: true,
      visitor_safety_confirmation: true,
    },
  }),
  "hyundai-hoist": createTenantConfig({
    tenantCode: "hyundai-hoist",
    legacyMode: false,
    displayName: "현대호이스트",
    industryProfile: "hoist-manufacturing",
    enabledModes: FIELD_QR_MODES,
    rememberInfoEnabled: true,
    signatureRequiredModes: {
      monthly_risk_share_confirmation: true,
      daily_prework_safety_check: true,
      visitor_safety_confirmation: true,
    },
  }),
  unknown: createTenantConfig({
    tenantCode: "unknown",
    legacyMode: true,
    displayName: "현장",
    industryProfile: "general",
  }),
};

export function normalizeFieldQrTenantCode(
  value?: string | null
): FieldQrTenantCode {
  const code = (value ?? "").trim().toLowerCase();

  if (code === "daedo") {
    return "daedo";
  }

  if (code === "dongwoo") {
    return "dongwoo";
  }

  if (
    code === "hankookgreen" ||
    code === "korea-green" ||
    code === "korea_green" ||
    code === "koreagreen" ||
    code === "greenkorea"
  ) {
    return "hankookgreen";
  }

  if (
    code === "bubblemon" ||
    code === "bubble_mon" ||
    code === "bubblemonkorea" ||
    code === "버블몬" ||
    code === "버블몬코리아"
  ) {
    return "bubblemon";
  }

  if (
    code === "richi" ||
    code === "richi-korea" ||
    code === "리치" ||
    code === "리치코리아"
  ) {
    return "richi";
  }

  if (
    code === "hyundai-hoist" ||
    code === "hyundai_hoist" ||
    code === "hoist" ||
    code === "현대호이스트"
  ) {
    return "hyundai-hoist";
  }

  return "unknown";
}

export function getFieldQrTenantConfig(
  tenantCode: string
): FieldQrTenantConfig {
  return FIELD_QR_TENANT_CONFIGS[normalizeFieldQrTenantCode(tenantCode)];
}
