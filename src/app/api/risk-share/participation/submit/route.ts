import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { insertFieldParticipationSubmissionShadowRecord } from "@/lib/supabaseServer";
import {
  buildRiskShareLangHref,
  getRiskShareLocale,
  type RiskShareLocale,
} from "@/lib/risk-share/riskShareI18n";
import { resolveActiveRiskSharePublicTenant } from "@/lib/risk-share/riskSharePublicTenantGuard";
import { resolveActiveRiskSharePublicVersion } from "@/lib/risk-share/riskSharePublicVersion";
import { getRiskSharePreworkChecklistTemplate } from "@/lib/risk-share/riskShareChecklistTemplate";
import { insertRiskShareVersionConfirmation } from "@/lib/risk-share/riskShareVersionConfirmation";
import { resolveOptionalRiskShareSignatureFile } from "@/lib/risk-share/riskShareSignatureFileGuard";
import {
  deletePrivateRiskShareSignature,
  uploadPrivateRiskShareSignature,
} from "@/lib/risk-share/riskShareSignatureBlob";

export const dynamic = "force-dynamic";

type ParticipationMode = "monthly" | "prework";

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
  const confirmationIdempotencyKey = getFormText(
    formData,
    "confirmationIdempotencyKey",
  ).toLowerCase();

  if (
    mode === "monthly" &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      confirmationIdempotencyKey,
    )
  ) {
    return NextResponse.redirect(
      new URL(buildParticipationHref(companyCode, mode, lang, "error"), req.url),
      { status: 303 },
    );
  }

  let monthlyVersionProvenance: {
    version_lock_id: string;
    version_lock_month: string;
    confirmed_share_item_ids: string[];
    confirmed_share_item_count: number;
    version_confirmed_at: string;
  } | null = null;

  if (mode === "monthly") {
    const versionResult = await resolveActiveRiskSharePublicVersion(tenant.code);

    if (!versionResult.ok) {
      return NextResponse.redirect(
        new URL(buildParticipationHref(companyCode, mode, lang, "version_unavailable"), req.url),
        { status: 303 }
      );
    }

    const expectedItemIds = versionResult.version.items.map((item) => item.id);
    const submittedVersionLockId = getFormText(formData, "versionLockId");
    const submittedShareItemIds = formData
      .getAll("shareItemId")
      .map((value) => String(value).trim())
      .filter(Boolean);
    const submittedIdSet = new Set(submittedShareItemIds);

    if (submittedVersionLockId !== versionResult.version.lock.id) {
      return NextResponse.redirect(
        new URL(buildParticipationHref(companyCode, mode, lang, "version_changed"), req.url),
        { status: 303 }
      );
    }

    const itemSetMatches =
      expectedItemIds.length > 0 &&
      submittedShareItemIds.length === expectedItemIds.length &&
      submittedIdSet.size === submittedShareItemIds.length &&
      submittedIdSet.size === expectedItemIds.length &&
      expectedItemIds.every((id) => submittedIdSet.has(id));
    const allConfirmed = expectedItemIds.every((id) =>
      getFormChecked(formData, `shareItemConfirmed-${id}`)
    );

    if (!itemSetMatches || !allConfirmed) {
      return NextResponse.redirect(
        new URL(buildParticipationHref(companyCode, mode, lang, "incomplete_confirmation"), req.url),
        { status: 303 }
      );
    }

    monthlyVersionProvenance = {
      version_lock_id: versionResult.version.lock.id,
      version_lock_month: versionResult.version.lock.month,
      confirmed_share_item_ids: [...expectedItemIds].sort(),
      confirmed_share_item_count: expectedItemIds.length,
      version_confirmed_at: new Date().toISOString(),
    };
  }

  const checklistTemplate =
    mode === "prework" ? getRiskSharePreworkChecklistTemplate(lang) : null;

  if (
    checklistTemplate &&
    (getFormText(formData, "checklistTemplateId") !== checklistTemplate.templateId ||
      getFormText(formData, "checklistTemplateVersion") !==
        checklistTemplate.templateVersion)
  ) {
    return NextResponse.redirect(
      new URL(buildParticipationHref(companyCode, mode, lang, "form_changed"), req.url),
      { status: 303 },
    );
  }

  const checklist = checklistTemplate?.items ?? [];
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

  const signatureResolution = await resolveOptionalRiskShareSignatureFile(
    formData.get("signatureFile"),
  );

  if (!signatureResolution.ok) {
    return NextResponse.redirect(
      new URL(buildParticipationHref(companyCode, mode, lang, "error"), req.url),
      { status: 303 }
    );
  }

  const monthlyRequestDigest =
    mode === "monthly" && monthlyVersionProvenance
      ? createHash("sha256")
          .update(
            JSON.stringify({
              tenantCode: tenant.code,
              versionLockId: monthlyVersionProvenance.version_lock_id,
              itemIds: monthlyVersionProvenance.confirmed_share_item_ids,
              workerName,
              workerAffiliation,
              workerIdentifier,
              lang,
              signaturePresent: Boolean(signatureResolution.file),
            }),
          )
          .digest("hex")
      : null;

  const modeLabel = mode === "monthly" ? "월간 위험성평가 공유확인" : "작업 전 안전확인";
  const confirmationType = mode === "monthly" ? "risk_share_confirm_monthly" : "risk_share_confirm_prework";
  const reportedDate = getTodayDateValue();
  const signatureFile = signatureResolution.file;
  const oidcToken = req.headers.get("x-vercel-oidc-token")?.trim() ?? "";

  let signatureUpload: Awaited<ReturnType<typeof uploadPrivateRiskShareSignature>> | null = null;

  if (signatureFile) {
    signatureUpload = await uploadPrivateRiskShareSignature(
      signatureFile,
      `risk-share-signatures/${tenant.code}/${mode}/${reportedDate}`,
      oidcToken,
    );

    if (!signatureUpload.ok) {
      return NextResponse.redirect(
        new URL(buildParticipationHref(companyCode, mode, lang, "error"), req.url),
        { status: 303 }
      );
    }
  }

  const submissionRecord = {
    tenant_code: tenant.code,
    company_name: tenant.name,
    submission_type: "공유확인",
    legacy_type: "공유확인",
    title: `${tenant.name} ${modeLabel}`,
    content:
      mode === "monthly"
        ? `${modeLabel} 위험요인 ${monthlyVersionProvenance?.confirmed_share_item_count ?? 0}건 확인 완료`
        : `${modeLabel} 체크리스트 ${checkedCount}/${checklist.length}개 확인 완료`,
    location: workerAffiliation,
    submitter: workerName || "근로자",
    anonymous: false,
    reported_date: reportedDate,
    status: "접수",
    notion_page_id: null,
    notion_url: null,
    file_urls: [],
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
      ...(mode === "prework"
        ? {
            checklist_template_id: checklistTemplate?.templateId,
            checklist_template_version: checklistTemplate?.templateVersion,
            checklist_locale: checklistTemplate?.locale,
            checklist_items_snapshot: checkedItems,
            checked_items: checkedItems,
            checked_count: checkedCount,
            all_checked: allChecked,
          }
        : {}),
      ...(monthlyVersionProvenance ?? {}),
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
      submitted_at: new Date().toISOString(),
    },
  };

  const result =
    mode === "monthly" && monthlyVersionProvenance && monthlyRequestDigest
      ? await insertRiskShareVersionConfirmation({
          ...submissionRecord,
          version_lock_id: monthlyVersionProvenance.version_lock_id,
          confirmed_share_item_ids:
            monthlyVersionProvenance.confirmed_share_item_ids,
          confirmation_idempotency_key: confirmationIdempotencyKey,
          confirmation_request_digest: monthlyRequestDigest,
        })
      : await insertFieldParticipationSubmissionShadowRecord(submissionRecord);

  if (!result.ok) {
    if (
      "code" in result &&
      result.code === "idempotency_conflict"
    ) {
      if (signatureUpload?.ok) {
        await deletePrivateRiskShareSignature(signatureUpload.cleanupUrl, oidcToken);
      }

      return NextResponse.redirect(
        new URL(
          buildParticipationHref(
            companyCode,
            mode,
            lang,
            "idempotency_conflict",
          ),
          req.url,
        ),
        { status: 303 },
      );
    }
    if (signatureUpload?.ok) {
      await deletePrivateRiskShareSignature(signatureUpload.cleanupUrl, oidcToken);
    }

    return NextResponse.redirect(
      new URL(buildParticipationHref(companyCode, mode, lang, "error"), req.url),
      { status: 303 }
    );
  }

  if ("replayed" in result && result.replayed && signatureUpload?.ok) {
    await deletePrivateRiskShareSignature(signatureUpload.cleanupUrl, oidcToken);
  }

  return NextResponse.redirect(
    new URL(buildParticipationHref(companyCode, mode, lang, "1"), req.url),
    { status: 303 }
  );
}
