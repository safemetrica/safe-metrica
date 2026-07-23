import { del, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { resolveRiskShareCanonicalSiteScopeForTenant } from "@/lib/risk-share/riskShareCanonicalSiteScopeServer";
import { getTenantRegistryConfigByCode } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const MAX_SOURCE_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_SOURCE_TYPES = new Set([
  "risk_assessment_pdf",
  "risk_assessment_excel",
  "risk_assessment_image",
  "customer_document",
  "other",
]);

type SupabaseInsertResult = {
  ok: boolean;
  status: number;
  statusText: string;
  data?: unknown;
  message?: string;
};

function isOwner(req: NextRequest) {
  const ownerToken = req.cookies.get("sm_owner_token")?.value;
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;

  return Boolean(expectedToken && ownerToken === expectedToken);
}

function getFormText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function normalizeCompanyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50);
}

function cleanText(value: string, max = 160) {
  return value.trim().slice(0, max);
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, "_").slice(0, 160);
}

function getSourceType(value: string) {
  return ALLOWED_SOURCE_TYPES.has(value) ? value : "other";
}

function getSupabaseEnv() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, serviceRoleKey };
}

async function insertRiskShareSourceRecord(record: {
  company_code: string;
  company_name: string | null;
  site_id: string;
  site_name: string | null;
  source_title: string;
  source_type: string;
  file_url: string;
  file_name: string | null;
  file_mime_type: string | null;
  file_size: number | null;
  storage_provider: string;
  uploaded_by: string | null;
  source_note: string | null;
}): Promise<SupabaseInsertResult> {
  const env = getSupabaseEnv();

  if (!env) {
    return {
      ok: false,
      status: 503,
      statusText: "missing_supabase_env",
      message: "Supabase 저장 설정이 없습니다.",
    };
  }

  const res = await fetch(`${env.supabaseUrl}/rest/v1/risk_share_sources`, {
    method: "POST",
    headers: {
      apikey: env.serviceRoleKey,
      authorization: `Bearer ${env.serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify(record),
  });

  const data = await res.json().catch(() => undefined);

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : undefined;

    return {
      ok: false,
      status: res.status,
      statusText: res.statusText,
      data,
      message,
    };
  }

  return {
    ok: true,
    status: res.status,
    statusText: res.statusText,
    data,
  };
}

export async function POST(req: NextRequest) {
  if (!isOwner(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: "owner_required",
        message: "Owner 권한이 필요합니다.",
      },
      { status: 403 }
    );
  }

  const formData = await req.formData();

  const companyCode = normalizeCompanyCode(getFormText(formData, "companyCode"));
  const companyName = cleanText(getFormText(formData, "companyName"), 80);
  const siteName = cleanText(getFormText(formData, "siteName"), 80);
  const sourceTitle = cleanText(getFormText(formData, "sourceTitle"), 120);
  const sourceType = getSourceType(getFormText(formData, "sourceType"));
  const uploadedBy = cleanText(getFormText(formData, "uploadedBy"), 80);
  const sourceNote = cleanText(getFormText(formData, "sourceNote"), 500);
  const sourceFile = formData.get("sourceFile");

  if (!companyCode) {
    return NextResponse.json(
      {
        ok: false,
        error: "company_code_required",
        message: "고객 코드 후보가 필요합니다.",
      },
      { status: 400 }
    );
  }

  const tenant = await getTenantRegistryConfigByCode(companyCode).catch(() => null);
  const siteScope = tenant
    ? await resolveRiskShareCanonicalSiteScopeForTenant(
        tenant.code,
        tenant.defaultSiteId,
      ).catch(() => ({ ok: false as const }))
    : { ok: false as const };

  if (!tenant || !siteScope.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "site_scope_unavailable",
        message: "고객사의 canonical site를 확인할 수 없습니다.",
      },
      { status: 409 },
    );
  }

  if (!sourceTitle) {
    return NextResponse.json(
      {
        ok: false,
        error: "source_title_required",
        message: "source 문서명이 필요합니다.",
      },
      { status: 400 }
    );
  }

  if (!isFile(sourceFile)) {
    return NextResponse.json(
      {
        ok: false,
        error: "source_file_required",
        message: "위험성평가 source 파일이 필요합니다.",
      },
      { status: 400 }
    );
  }

  if (sourceFile.size > MAX_SOURCE_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: "source_file_too_large",
        message: "source 파일은 20MB 이하만 접수합니다.",
      },
      { status: 400 }
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_blob_token",
        message: "파일 저장 설정이 없습니다. BLOB_READ_WRITE_TOKEN을 확인해 주세요.",
      },
      { status: 503 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const safeFileName = sanitizeFileName(sourceFile.name || "risk-share-source");
  const blobPath = `risk-share-sources/${tenant.code}/${today}/${Date.now()}-${safeFileName}`;

  let blob: Awaited<ReturnType<typeof put>>;

  try {
    blob = await put(blobPath, sourceFile, {
      access: "public",
      addRandomSuffix: true,
    });
  } catch (error) {
    console.error("[risk-share-source-intake] blob upload failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "blob_upload_failed",
        message: "source 파일 업로드 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }

  const insertResult = await insertRiskShareSourceRecord({
    company_code: tenant.code,
    company_name: companyName || null,
    site_id: siteScope.siteId,
    site_name: siteName || null,
    source_title: sourceTitle,
    source_type: sourceType,
    file_url: blob.url,
    file_name: sourceFile.name || null,
    file_mime_type: sourceFile.type || null,
    file_size: sourceFile.size,
    storage_provider: "vercel_blob",
    uploaded_by: uploadedBy || null,
    source_note: sourceNote || null,
  });

  if (!insertResult.ok) {
    console.warn("[risk-share-source-intake] source metadata insert failed", {
      status: insertResult.status,
      statusText: insertResult.statusText,
      message: insertResult.message,
    });

    let rollbackOk = false;

    try {
      await del(blob.url);
      rollbackOk = true;
    } catch (error) {
      console.error("[risk-share-source-intake] blob rollback failed", error);
    }

    return NextResponse.json(
      {
        ok: false,
        error: "source_metadata_insert_failed",
        message: rollbackOk
          ? "source 메타데이터 저장에 실패해 업로드 파일을 자동 삭제했습니다. Supabase risk_share_sources 테이블 적용 여부를 확인하세요."
          : "파일은 업로드됐지만 source 메타데이터 저장에 실패했고, 업로드 파일 자동 삭제도 실패했습니다. Vercel Blob에서 수동 삭제가 필요합니다.",
        rollbackOk,
        fileUrl: rollbackOk ? undefined : blob.url,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: "source_received",
    message: "Risk Share source 파일이 접수되었습니다. AI 추출 대기 상태로 전환합니다.",
    source: {
      companyCode: tenant.code,
      companyName,
      siteName,
      sourceTitle,
      sourceType,
      fileUrl: blob.url,
      fileName: sourceFile.name,
      fileSize: sourceFile.size,
      storageProvider: "vercel_blob",
      rawTextStatus: "pending",
      extractionStatus: "pending",
      reviewStatus: "pending",
    },
  });
}
