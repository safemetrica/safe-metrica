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

function getFormText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getFormChecked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

function isRiskSharePackTenant(serviceMode?: string | null) {
  return serviceMode === "risk_share_pack" || serviceMode === "full_safemetrica";
}

function getTodayDateValue() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function buildFieldHref(companyCode: string, lang: RiskShareLocale) {
  return buildRiskShareLangHref("/risk-share/field", { company: companyCode }, lang);
}

function buildVisitorHref(companyCode: string, lang: RiskShareLocale, submitted: string) {
  const href = buildRiskShareLangHref("/risk-share/visitor", { company: companyCode }, lang);
  return `${href}&submitted=${submitted}`;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const companyCode = normalizeCompanyCode(getFormText(formData, "companyCode"));
  const lang = getRiskShareLocale(getFormText(formData, "lang"));

  if (!companyCode) {
    return NextResponse.redirect(new URL(buildFieldHref(companyCode, lang), req.url), {
      status: 303,
    });
  }

  const tenant = await getTenantRegistryConfigByCode(companyCode).catch(() => null);

  if (!tenant || !isRiskSharePackTenant(tenant.serviceMode)) {
    return NextResponse.redirect(new URL(buildFieldHref(companyCode, lang), req.url), {
      status: 303,
    });
  }

  const purpose = getFormText(formData, "visitPurpose");
  const visitorCompany = getFormText(formData, "visitorCompany");
  const visitorName = getFormText(formData, "visitorName");
  const checkedSafetyGuide = getFormChecked(formData, "checkedSafetyGuide");

  const result = await insertFieldParticipationSubmissionShadowRecord({
    tenant_code: tenant.code,
    company_name: tenant.name,
    submission_type: "외부인확인",
    legacy_type: "외부인확인",
    title: `${tenant.name} 외부인 출입 전 안전확인`,
    content: `방문 목적: ${purpose || "미입력"} · 안전 안내 확인: ${checkedSafetyGuide ? "확인" : "미확인"}`,
    location: "",
    submitter: visitorName || "미입력",
    anonymous: !visitorName,
    reported_date: getTodayDateValue(),
    status: "접수",
    notion_page_id: null,
    notion_url: null,
    file_urls: [],
    raw_payload: {
      purpose,
      visitorCompany,
      visitorName,
      checkedSafetyGuide,
      lang,
      source: "risk_share_visitor_confirmation_v1",
    },
  });

  if (!result.ok) {
    return NextResponse.redirect(new URL(buildVisitorHref(companyCode, lang, "error"), req.url), {
      status: 303,
    });
  }

  return NextResponse.redirect(new URL(buildVisitorHref(companyCode, lang, "1"), req.url), {
    status: 303,
  });
}
