import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  selectSupabaseExportRows,
  type TenantRegistryRow,
} from "@/lib/supabaseServer";
import {
  validateOwnerTenantOnboardingDraft,
} from "@/lib/tenant-onboarding/ownerTenantOnboardingValidation";
import { createOwnerTenantDefaultSite } from "@/lib/tenant-onboarding/ownerTenantSiteActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_RISK_SHARE_MODULES = [
  "worker_qr_e_confirmation",
  "quick_feedback",
  "manager_inbox",
  "monthly_result",
  "customer_delivery_pack",
];

function isOwnerTokenValid(ownerToken?: string) {
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;
  return Boolean(expectedToken && ownerToken === expectedToken);
}

function readText(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const FORBIDDEN_FREE_TEXT_PATTERN =
  /(token|api[_ -]?key|service[_ -]?role|secret|password|owner[_ -]?token|env|토큰|인증키|비밀번호|패스워드|주민번호|주민등록번호|계좌번호|카드번호)/i;

function hasForbiddenFreeText(...values: string[]) {
  return values.some((value) => FORBIDDEN_FREE_TEXT_PATTERN.test(value));
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.replace(/\/+$/, "");
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function buildRedirect(
  request: NextRequest,
  params: Record<string, string>
) {
  const url = new URL("/owner/tenant-onboarding/draft", request.url);

  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url);
}

async function findTenantRegistryRow(companyCode: string) {
  const query = new URLSearchParams({
    select: "id,company_code,company_name,status,service_mode",
    company_code: `eq.${companyCode}`,
    limit: "1",
  });

  const rows = await selectSupabaseExportRows<TenantRegistryRow>(
    "tenant_registry",
    query
  );

  return rows[0] ?? null;
}

async function insertTenantRegistryRow(record: Record<string, unknown>) {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ok: false,
      status: 0,
      statusText: "missing_supabase_server_config",
      message: "Supabase server configuration is missing.",
    };
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/tenant_registry`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(record),
  });

  if (res.ok) {
    const data = await res.json().catch(() => undefined);
    return {
      ok: true,
      status: res.status,
      statusText: res.statusText,
      data,
    };
  }

  const data = await res.json().catch(() => undefined);
  const message = typeof data?.message === "string" ? data.message : undefined;

  return {
    ok: false,
    status: res.status,
    statusText: res.statusText,
    message,
    data,
  };
}

export async function POST(request: NextRequest) {
  const c = await cookies();
  const ownerToken = c.get("sm_owner_token")?.value;

  if (!isOwnerTokenValid(ownerToken)) {
    return buildRedirect(request, {
      error: "owner_required",
    });
  }

  const formData = await request.formData();

  const companyCodeInput = readText(formData, "company_code", 80);
  const companyNameInput = readText(formData, "company_name", 120);
  const defaultSiteName = readText(formData, "default_site_name", 120);
  const contactLabel = readText(formData, "contact_label", 120);
  const ownerNotes = readText(formData, "owner_notes", 1000);

  if (hasForbiddenFreeText(defaultSiteName, contactLabel, ownerNotes)) {
    return buildRedirect(request, {
      error: "sensitive_text_not_allowed",
      companyCode: companyCodeInput,
      companyName: companyNameInput,
    });
  }

  const validation = validateOwnerTenantOnboardingDraft({
    companyCode: companyCodeInput,
    displayName: companyNameInput,
    serviceMode: "risk_share_pack",
    enabledModules: DEFAULT_RISK_SHARE_MODULES,
    rawPayload: {
      source: "owner_risk_share_tenant_create_v1",
      commercialFlow: "owner_contract",
    },
  });

  const companyCode = validation.normalized.companyCode;
  const companyName = validation.normalized.displayName;

  if (!validation.ok) {
    return buildRedirect(request, {
      error: validation.errors[0] ?? "invalid_input",
      companyCode: companyCodeInput,
      companyName: companyNameInput,
    });
  }

  try {
    const existingTenant = await findTenantRegistryRow(companyCode);

    if (existingTenant) {
      return buildRedirect(request, {
        created: "already_exists",
        companyCode,
      });
    }
  } catch {
    return buildRedirect(request, {
      error: "tenant_lookup_failed",
      companyCode,
      companyName,
    });
  }

  const result = await insertTenantRegistryRow({
    company_code: companyCode,
    company_name: companyName,
    status: "onboarding",
    service_mode: "risk_share_pack",
    enabled_modules: DEFAULT_RISK_SHARE_MODULES,
    plan_type: "paid_operation",
    default_site_name: defaultSiteName || null,
    owner_notes: ownerNotes || null,
    source_channel: "owner_direct",
    contact_label: contactLabel || null,
    raw_payload: {
      source: "owner_risk_share_tenant_create_v1",
      commercialFlow: "owner_contract",
      createdBy: "owner",
      createdAt: new Date().toISOString(),
      note: "No payment, invite, auth token, password, or customer sensitive data is stored by this action.",
    },
  });

  if (!result.ok) {
    return buildRedirect(request, {
      error: "tenant_insert_failed",
      companyCode,
      companyName,
    });
  }

  // Prepares the tenant_sites default row atomically (create_tenant_default_site
  // RPC) so tenant_registry.default_site_id and the new site row are always
  // in sync. The tenant row above is still created with status "onboarding"
  // -- activateOwnerTenant() independently re-verifies the real tenant_sites
  // default row before allowing activation, so a failure here blocks
  // activation later rather than silently leaving a half-configured tenant.
  if (defaultSiteName) {
    const siteResult = await createOwnerTenantDefaultSite({
      companyCode,
      siteName: defaultSiteName,
    });

    if (!siteResult.ok) {
      return buildRedirect(request, {
        created: "1",
        companyCode,
        siteWarning: siteResult.reason,
      });
    }
  }

  return buildRedirect(request, {
    created: "1",
    companyCode,
  });
}
