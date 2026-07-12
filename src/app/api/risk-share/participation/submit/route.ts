import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { insertFieldParticipationSubmissionShadowRecord } from "@/lib/supabaseServer";
import {
  buildRiskShareLangHref,
  getRiskShareCopy,
  getRiskShareLocale,
  type RiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";

export const dynamic = "force-dynamic";

const MAX_SIGNATURE_FILE_SIZE_BYTES = 1.5 * 1024 * 1024;

type ParticipationMode = "monthly" | "prework";

function getFormText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getFormChecked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function isFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

async function uploadWorkerSignature(
  file: File,
  companyCode: string,
  mode: ParticipationMode,
  reportedDate: string,
): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN || file.size > MAX_SIGNATURE_FILE_SIZE_BYTES) {
    return null;
  }

  try {
    const blob = await put(
      `risk-share-worker-signature/${companyCode}/${mode}/${reportedDate}/${Date.now()}-signature.png`,
      file,
      { access: "public", addRandomSuffix: true },
    );

    return blob.url;
  } catch {
    return null;
  }
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);
}

function normalizeMode(value: string): ParticipationMode | null {
  return value === "monthly" || value === "prework" ? value : null;
}

function getTodayDateValue() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function buildParticipationHref(
  companyCode: string,
  mode: string | null,
  lang: RiskShareLocale,
  submitted?: string
) {
  const href = buildRiskShareLangHref(
    "/risk-share/participation",
    { company: companyCode, mode: mode ?? undefined },
    lang
  );

  return submitted ? `${href}&submitted=${submitted}` : href;
}

function buildFieldHref(companyCode: string, lang: RiskShareLocale) {
  return buildRiskShareLangHref("/risk-share/field", { company: companyCode }, lang);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const companyCode = normalizeCompanyCode(getFormText(formData, "companyCode"));
  const mode = normalizeMode(getFormText(formData, "mode"));
  const lang = getRiskShareLocale(getFormText(formData, "lang"));

  if (!companyCode || !mode) {
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

  const checklist = getRiskShareCopy(lang).participation[mode].checklist;
  const checkedItems = checklist.map((label, index) => ({
    label,
    checked: getFormChecked(formData, `checklist-${mode}-${index}`),
  }));
  const checkedCount = checkedItems.filter((item) => item.checked).length;
  const allChecked = checklist.length > 0 && checkedCount === checklist.length;
  const workerName = getFormText(formData, "workerName").slice(0, 60);
  const workerAffiliation = getFormText(formData, "workerAffiliation").slice(0, 80);
  const workerIdentifier = getFormText(formData, "workerIdentifier").slice(0, 20);

  if (!workerIdentifier) {
    return NextResponse.redirect(
      new URL(buildParticipationHref(companyCode, mode, lang, "missing_identifier"), req.url),
      { status: 303 }
    );
  }

  const modeLabel = mode === "monthly" ? "월간 위험성평가 공유확인" : "작업 전 안전확인";
  const confirmationType = mode === "monthly" ? "risk_share_confirm_monthly" : "risk_share_confirm_prework";
  const reportedDate = getTodayDateValue();
  const signatureFileEntry = formData.get("signatureFile");
  const signatureFile = isFile(signatureFileEntry) ? signatureFileEntry : null;
  const signatureUrl = signatureFile
    ? await uploadWorkerSignature(signatureFile, tenant.code, mode, reportedDate)
    : null;

  const result = await insertFieldParticipationSubmissionShadowRecord({
    tenant_code: tenant.code,
    company_name: tenant.name,
    submission_type: "공유확인",
    legacy_type: "공유확인",
    title: `${tenant.name} ${modeLabel}`,
    content: `${modeLabel} 체크리스트 ${checkedCount}/${checklist.length}개 확인 완료`,
    location: workerAffiliation,
    submitter: workerName || "근로자",
    anonymous: false,
    reported_date: reportedDate,
    status: "접수",
    notion_page_id: null,
    notion_url: null,
    file_urls: signatureUrl ? [signatureUrl] : [],
    raw_payload: {
      source: "risk_share_participation_submit_v1",
      source_channel: "risk_share_participation_submit_v1",
      mode,
      confirmation_type: confirmationType,
      company_code: tenant.code,
      lang,
      worker_name: workerName,
      worker_affiliation: workerAffiliation,
      worker_identifier: workerIdentifier,
      identity_mode: "identified",
      checked_items: checkedItems,
      checked_count: checkedCount,
      all_checked: allChecked,
      signature_present: Boolean(signatureUrl),
      signature_url: signatureUrl,
      submitted_at: new Date().toISOString(),
    },
  });

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(buildParticipationHref(companyCode, mode, lang, "error"), req.url),
      { status: 303 }
    );
  }

  return NextResponse.redirect(
    new URL(buildParticipationHref(companyCode, mode, lang, "1"), req.url),
    { status: 303 }
  );
}
