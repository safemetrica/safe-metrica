export type FieldQrMode =
  | "monthly_risk_share_confirmation"
  | "daily_prework_safety_check"
  | "anonymous_feedback"
  | "visitor_safety_confirmation";

export type FieldQrCadence = "monthly" | "daily" | "event";

export type FieldQrTenantCode =
  | "daedo"
  | "dongwoo"
  | "hankookgreen"
  | "bubblemon"
  | "richi"
  | "hyundai-hoist"
  | "unknown";

export type FieldQrWorkerIdentity = {
  workerName: string;
  workerTeam: string;
  workerPhoneLast4: string;
  workerEmployeeNo: string;
};

export type FieldQrModePolicy = {
  mode: FieldQrMode;
  enabled: boolean;
  cadence: FieldQrCadence;
  identityRequired: boolean;
  signatureRequired: boolean;
  rememberInfoEnabled: boolean;
  riskSummaryRequired: boolean;
  anonymous: boolean;
};

export type FieldQrTenantConfig = {
  tenantCode: FieldQrTenantCode;
  legacyMode: boolean;
  displayName: string;
  industryProfile: string;
  enabledModes: FieldQrMode[];
  modePolicies: Record<FieldQrMode, FieldQrModePolicy>;
  rememberInfoEnabled: boolean;
};
