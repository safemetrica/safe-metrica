import "server-only";

import { createHash } from "node:crypto";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

type SignupInput = {
  companyName: string;
  displayName: string;
  email: string;
  password: string;
};

export type SelfServiceSignupResult =
  | { ok: true; status: "created" | "already_exists"; companyCode: string }
  | { ok: false; reason: "invalid_input" | "account_company_conflict" | "company_exists" | "signup_conflict" | "service_unavailable" };

type AuthUser = { id: string; email: string };

function getConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  return url && serviceRoleKey && anonKey ? { url, serviceRoleKey, anonKey } : null;
}

function normalizeInput(input: SignupInput) {
  return {
    companyName: input.companyName.normalize("NFKC").replace(/\s+/g, " ").trim(),
    displayName: input.displayName.normalize("NFKC").replace(/\s+/g, " ").trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
  };
}

export function validateSelfServiceSignupInput(input: SignupInput) {
  const normalized = normalizeInput(input);
  const ok =
    normalized.companyName.length >= 2
    && normalized.companyName.length <= 120
    && normalized.displayName.length >= 2
    && normalized.displayName.length <= 80
    && normalized.email.length <= 320
    && EMAIL_PATTERN.test(normalized.email)
    && normalized.password.length >= 10
    && normalized.password.length <= 128;
  return { ok, normalized };
}

export function buildSelfServiceCompanyCode(companyName: string) {
  const normalized = companyName.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  const slug = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  const digest = createHash("sha256").update(normalized).digest("hex").slice(0, 12);
  const code = `${slug || "company"}-${digest}`.slice(0, 64);
  if (!COMPANY_CODE_PATTERN.test(code)) throw new Error("invalid_generated_company_code");
  return code;
}

async function createAuthUser(input: ReturnType<typeof normalizeInput>, config: NonNullable<ReturnType<typeof getConfig>>) {
  const res = await fetch(`${config.url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { display_name: input.displayName },
    }),
    cache: "no-store",
  });

  if (res.ok) {
    const data = await res.json().catch(() => null);
    return typeof data?.id === "string" ? { ok: true as const, user: { id: data.id, email: input.email } } : { ok: false as const };
  }

  // A safe retry may encounter the Auth user created by the first attempt.
  // Prove knowledge of the same password before resuming tenant creation.
  if (res.status === 400 || res.status === 422) {
    const verified = await verifyExistingAuthUser(input.email, input.password, config);
    if (verified) return { ok: true as const, user: verified };
  }

  return { ok: false as const };
}

async function verifyExistingAuthUser(email: string, password: string, config: NonNullable<ReturnType<typeof getConfig>>): Promise<AuthUser | null> {
  const res = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return typeof data?.user?.id === "string" && typeof data?.user?.email === "string"
    ? { id: data.user.id, email: data.user.email.toLowerCase() }
    : null;
}

async function createTenantAndMembership(params: {
  user: AuthUser;
  companyCode: string;
  companyName: string;
  displayName: string;
  config: NonNullable<ReturnType<typeof getConfig>>;
}): Promise<SelfServiceSignupResult> {
  const res = await fetch(`${params.config.url}/rest/v1/rpc/create_self_service_tenant`, {
    method: "POST",
    headers: {
      apikey: params.config.serviceRoleKey,
      Authorization: `Bearer ${params.config.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_user_id: params.user.id,
      p_email: params.user.email,
      p_company_code: params.companyCode,
      p_company_name: params.companyName,
      p_display_name: params.displayName,
    }),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, reason: "service_unavailable" };
  const data = await res.json().catch(() => null);
  const row = Array.isArray(data) ? data[0] : null;
  if (row?.ok === true && (row.result_code === "created" || row.result_code === "already_exists") && typeof row.tenant_code === "string") {
    return { ok: true, status: row.result_code, companyCode: row.tenant_code };
  }
  if (row?.result_code === "account_company_conflict" || row?.result_code === "company_exists" || row?.result_code === "signup_conflict") {
    return { ok: false, reason: row.result_code };
  }
  return { ok: false, reason: "service_unavailable" };
}

export async function createSelfServiceSignup(input: SignupInput): Promise<SelfServiceSignupResult> {
  const validation = validateSelfServiceSignupInput(input);
  if (!validation.ok) return { ok: false, reason: "invalid_input" };
  const config = getConfig();
  if (!config) return { ok: false, reason: "service_unavailable" };
  const auth = await createAuthUser(validation.normalized, config).catch(() => ({ ok: false as const }));
  if (!auth.ok) return { ok: false, reason: "signup_conflict" };
  const companyCode = buildSelfServiceCompanyCode(validation.normalized.companyName);
  return createTenantAndMembership({
    user: auth.user,
    companyCode,
    companyName: validation.normalized.companyName,
    displayName: validation.normalized.displayName,
    config,
  }).catch(() => ({ ok: false, reason: "service_unavailable" }));
}
