export const SITE_MANAGER_ALLOWED_COMPANY_CODES = new Set([
  "demo",
  "bubblemon",
  "daedo",
  "dongwoo",
  "hankookgreen",
  "korea-green",
  "greenkorea",
]);

export const SUBMIT_ONLY_COMPANY_CODES = new Set([
  "mons",
]);

export function normalizeRoleCompanyCode(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function isSiteManagerAllowedCompanyCode(value?: string | null) {
  const code = normalizeRoleCompanyCode(value);
  return SITE_MANAGER_ALLOWED_COMPANY_CODES.has(code);
}

export function isSubmitOnlyCompanyCode(value?: string | null) {
  const code = normalizeRoleCompanyCode(value);
  return SUBMIT_ONLY_COMPANY_CODES.has(code);
}
