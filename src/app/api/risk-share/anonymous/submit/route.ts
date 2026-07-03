import { NextRequest, NextResponse } from "next/server";

import {
  getTenantRegistryConfigByCode,
  insertFieldParticipationSubmissionShadowRecord,
} from "@/lib/supabaseServer";
import {
  buildRiskShareLangHref,
  getRiskShareLocale,
  type RiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";

export const dynamic = "force-dynamic";

const ANONYMOUS_FEEDBACK_TYPES = new Set([
  "불편사항",
  "개선제안",
  "위험제보",
  "아차사고",
  "기타",
]);

function getFormText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

function normalizeFeedbackType(value: string) {
  return ANONYMOUS_FEEDBACK_TYPES.has(value) ? value : "기타";
}

function isRiskSharePackTenant(serviceMode?: string | null) {
  return serviceMode === "risk_share_pack" || serviceMode === "full_safemetrica";
}

function getTodayDateValue() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function buildAnonymousHref(companyCode: string, lang: RiskShareLocale, status: "submitted" | "error") {
  const href = buildRiskShareLangHref("/risk-share/anonymous", { company: companyCode }, lang);
  return `${href}&${status}=1`;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const companyCode = normalizeCompanyCode(getFormText(formData, "companyCode"));
  const lang = getRiskShareLocale(getFormText(formData, "lang"));

  if (!companyCode) {
    return NextResponse.redirect(new URL(buildAnonymousHref(companyCode, lang, "error"), req.url), {
      status: 303,
    });
  }

  const tenant = await getTenantRegistryConfigByCode(companyCode).catch(() => null);

  if (!tenant || !isRiskSharePackTenant(tenant.serviceMode)) {
    return NextResponse.redirect(new URL(buildAnonymousHref(companyCode, lang, "error"), req.url), {
      status: 303,
    });
  }

  const feedbackType = normalizeFeedbackType(getFormText(formData, "feedbackType"));
  const location = getFormText(formData, "location").slice(0, 120);
  const content = getFormText(formData, "content").slice(0, 1900);

  if (content.length < 2) {
    return NextResponse.redirect(new URL(buildAnonymousHref(companyCode, lang, "error"), req.url), {
      status: 303,
    });
  }

  const result = await insertFieldParticipationSubmissionShadowRecord({
    tenant_code: tenant.code,
    company_name: tenant.name,
    submission_type: feedbackType,
    legacy_type: feedbackType,
    title: `${tenant.name} 익명 ${feedbackType}`,
    content,
    location,
    submitter: "익명",
    anonymous: true,
    reported_date: getTodayDateValue(),
    status: "접수",
    notion_page_id: null,
    notion_url: null,
    file_urls: [],
    raw_payload: {
      source: "risk_share_anonymous_feedback_v1",
      feedbackType,
      location,
      content,
      lang,
    },
  });

  if (!result.ok) {
    return NextResponse.redirect(new URL(buildAnonymousHref(companyCode, lang, "error"), req.url), {
      status: 303,
    });
  }

  return NextResponse.redirect(new URL(buildAnonymousHref(companyCode, lang, "submitted"), req.url), {
    status: 303,
  });
}
