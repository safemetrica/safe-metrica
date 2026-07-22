import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { insertRiskSharePublicSubmission } from "@/lib/risk-share/riskSharePublicSubmission";
import { consumeRiskSharePublicRateLimit } from "@/lib/risk-share/riskSharePublicRateLimit";
import {
  buildRiskShareLangHref,
  getRiskShareLocale,
  type RiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";

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

  const tenantResolution = await resolveActiveRiskSharePublicTenant(
    getFormText(formData, "companyCode"),
  );

  if (!tenantResolution.ok) {
    return NextResponse.redirect(new URL(buildFieldHref(companyCode, lang), req.url), {
      status: 303,
    });
  }

  const tenant = tenantResolution.tenant;

  const rateLimit = await consumeRiskSharePublicRateLimit({
    headers: req.headers,
    tenantCode: tenant.code,
    submissionKind: "visitor_confirmation",
  });
  if (!rateLimit.ok) {
    return NextResponse.redirect(new URL(buildVisitorHref(companyCode, lang, "error"), req.url), {
      status: 303,
    });
  }
  if (!rateLimit.allowed) {
    return NextResponse.redirect(new URL(buildVisitorHref(companyCode, lang, "rate_limited"), req.url), {
      status: 303,
    });
  }

  const purpose = getFormText(formData, "visitPurpose");
  const visitorCompany = getFormText(formData, "visitorCompany");
  const visitorName = getFormText(formData, "visitorName");
  const checkedSafetyGuide = getFormChecked(formData, "checkedSafetyGuide");
  const publicIdempotencyKey = getFormText(formData, "publicIdempotencyKey").toLowerCase();

  if (!checkedSafetyGuide) {
    return NextResponse.redirect(new URL(buildVisitorHref(companyCode, lang, "error"), req.url), {
      status: 303,
    });
  }

  const publicRequestDigest = createHash("sha256").update(JSON.stringify({
    tenantCode: tenant.code, purpose, visitorCompany, visitorName, checkedSafetyGuide, lang,
  })).digest("hex");

  const result = await insertRiskSharePublicSubmission({
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
    public_submission_kind: "visitor_confirmation",
    public_idempotency_key: publicIdempotencyKey,
    public_request_digest: publicRequestDigest,
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
