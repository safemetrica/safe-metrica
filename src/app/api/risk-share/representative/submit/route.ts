import { NextRequest, NextResponse } from "next/server";

import { insertFieldParticipationSubmissionShadowRecord } from "@/lib/supabaseServer";
import {
  buildRiskShareLangHref,
  getRiskShareLocale,
  type RiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { resolveOptionalRiskShareSignatureFile } from "@/lib/risk-share/riskShareSignatureFileGuard";
import {
  deletePrivateRiskShareSignature,
  uploadPrivateRiskShareSignature,
} from "@/lib/risk-share/riskShareSignatureBlob";

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

function buildRepresentativeHref(companyCode: string, lang: RiskShareLocale, status: "submitted" | "error") {
  const href = buildRiskShareLangHref("/risk-share/representative", { company: companyCode }, lang);
  return `${href}&${status}=1`;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const companyCode = normalizeCompanyCode(getFormText(formData, "companyCode"));
  const lang = getRiskShareLocale(getFormText(formData, "lang"));

  if (!companyCode) {
    return NextResponse.redirect(new URL(buildRepresentativeHref(companyCode, lang, "error"), req.url), {
      status: 303,
    });
  }

  const tenantResolution = await resolveActiveRiskSharePublicTenant(
    getFormText(formData, "companyCode"),
  );

  if (!tenantResolution.ok) {
    return NextResponse.redirect(new URL(buildRepresentativeHref(companyCode, lang, "error"), req.url), {
      status: 303,
    });
  }

  const tenant = tenantResolution.tenant;

  const representativeName = getFormText(formData, "representativeName").slice(0, 60);
  const affiliation = getFormText(formData, "affiliation").slice(0, 80);
  const opinion = getFormText(formData, "opinion").slice(0, 1900);
  const confirmed = getFormChecked(formData, "confirmed");
  const submitterLabel = representativeName || "근로자대표";
  const reportedDate = getTodayDateValue();

  const signatureResolution = await resolveOptionalRiskShareSignatureFile(
    formData.get("signatureFile"),
  );

  if (!signatureResolution.ok) {
    return NextResponse.redirect(new URL(buildRepresentativeHref(companyCode, lang, "error"), req.url), {
      status: 303,
    });
  }

  const signatureFile = signatureResolution.file;
  const oidcToken = req.headers.get("x-vercel-oidc-token")?.trim() ?? "";

  let signatureUpload: Awaited<ReturnType<typeof uploadPrivateRiskShareSignature>> | null = null;

  if (signatureFile) {
    signatureUpload = await uploadPrivateRiskShareSignature(
      signatureFile,
      `risk-share-signatures/${tenant.code}/representative/${reportedDate}`,
      oidcToken,
    );

    if (!signatureUpload.ok) {
      return NextResponse.redirect(new URL(buildRepresentativeHref(companyCode, lang, "error"), req.url), {
        status: 303,
      });
    }
  }

  const result = await insertFieldParticipationSubmissionShadowRecord({
    tenant_code: tenant.code,
    company_name: tenant.name,
    submission_type: "근로자대표확인",
    legacy_type: "근로자대표확인",
    title: `${tenant.name} 근로자대표 확인·의견`,
    content: opinion,
    location: "",
    submitter: submitterLabel,
    anonymous: false,
    reported_date: reportedDate,
    status: "접수",
    notion_page_id: null,
    notion_url: null,
    file_urls: [],
    raw_payload: {
      source: "risk_share_representative_confirmation_v1",
      representativeName,
      affiliation,
      opinion,
      confirmed,
      lang,
      signature_present: Boolean(signatureUpload?.ok),
      ...(signatureUpload?.ok
        ? {
            signature_storage_provider: "vercel_blob_private",
            signature_storage_access: "private",
            signature_pathname: signatureUpload.pathname,
            signature_content_type: signatureUpload.contentType,
            signature_size_bytes: signatureUpload.sizeBytes,
          }
        : {}),
    },
  });

  if (!result.ok) {
    if (signatureUpload?.ok) {
      await deletePrivateRiskShareSignature(signatureUpload.cleanupUrl, oidcToken);
    }

    return NextResponse.redirect(new URL(buildRepresentativeHref(companyCode, lang, "error"), req.url), {
      status: 303,
    });
  }

  return NextResponse.redirect(new URL(buildRepresentativeHref(companyCode, lang, "submitted"), req.url), {
    status: 303,
  });
}
