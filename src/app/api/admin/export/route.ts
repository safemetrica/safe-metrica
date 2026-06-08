import { type NextRequest, NextResponse } from "next/server";

import {
  selectSupabaseExportRows,
  SupabaseReadError,
} from "@/lib/supabaseServer";

type ExportRow = Record<string, unknown>;

type ParsedBoolean = { value: boolean } | { error: string };

type EvidenceManifestItem = {
  source: "field_participation_submissions" | "tbm_voice_submissions";
  sourceId: string | null;
  eventDate: string | null;
  name: string | null;
  url: string;
};

const COMPANY_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{1,49}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RESERVED_COMPANY_KEYS = new Set(["all", "*"]);

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function isOwner(request: NextRequest) {
  const ownerToken = request.cookies.get("sm_owner_token")?.value;
  const expectedToken = process.env.SAFEMETRICA_OWNER_TOKEN;

  return Boolean(expectedToken && ownerToken === expectedToken);
}

function parseBoolean(value: string | null, parameter: string): ParsedBoolean {
  if (value === null) {
    return { value: false };
  }

  if (value === "true") {
    return { value: true };
  }

  if (value === "false") {
    return { value: false };
  }

  return { error: `${parameter} must be true or false.` };
}

function parseDate(value: string) {
  if (!DATE_PATTERN.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

function getDayAfter(date: Date) {
  const nextDay = new Date(date);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay.toISOString().slice(0, 10);
}

function withoutNotionLinks(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(withoutNotionLinks);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nestedValue]) =>
      key === "notion_url" || key === "notion_page_url" || key === "pageUrl"
        ? []
        : [[key, withoutNotionLinks(nestedValue)]]
    )
  );
}

function getString(row: ExportRow, key: string) {
  return typeof row[key] === "string" ? row[key] : null;
}

function getSourceId(row: ExportRow) {
  const value = row.id ?? row.notion_page_id;
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function buildEvidenceManifest(
  fieldParticipation: ExportRow[],
  tbmVoiceSubmissions: ExportRow[]
): EvidenceManifestItem[] {
  const manifest: EvidenceManifestItem[] = [];

  for (const row of fieldParticipation) {
    if (!Array.isArray(row.file_urls)) {
      continue;
    }

    for (const fileUrl of row.file_urls) {
      if (typeof fileUrl === "string" && fileUrl.length > 0) {
        manifest.push({
          source: "field_participation_submissions",
          sourceId: getSourceId(row),
          eventDate: getString(row, "reported_date") ?? getString(row, "created_at"),
          name: null,
          url: fileUrl,
        });
      }
    }
  }

  for (const row of tbmVoiceSubmissions) {
    if (
      !row.uploaded_files ||
      typeof row.uploaded_files !== "object" ||
      Array.isArray(row.uploaded_files)
    ) {
      continue;
    }

    for (const files of Object.values(row.uploaded_files)) {
      if (!Array.isArray(files)) {
        continue;
      }

      for (const file of files) {
        if (!file || typeof file !== "object" || Array.isArray(file)) {
          continue;
        }

        const fileRecord = file as Record<string, unknown>;
        if (typeof fileRecord.url !== "string" || fileRecord.url.length === 0) {
          continue;
        }

        manifest.push({
          source: "tbm_voice_submissions",
          sourceId: getSourceId(row),
          eventDate: getString(row, "date_value") ?? getString(row, "created_at"),
          name: typeof fileRecord.name === "string" ? fileRecord.name : null,
          url: fileRecord.url,
        });
      }
    }
  }

  return manifest;
}

function buildPeriodFilter(
  createdAtColumn: string,
  eventDateColumn: string,
  startDate: string,
  endDate: string,
  dayAfterEnd: string
) {
  return `(${[
    `and(${createdAtColumn}.gte.${startDate}T00:00:00.000Z,${createdAtColumn}.lt.${dayAfterEnd}T00:00:00.000Z)`,
    `and(${eventDateColumn}.gte.${startDate},${eventDateColumn}.lte.${endDate})`,
  ].join(",")})`;
}

export async function GET(request: NextRequest) {
  // TODO: Replace this owner-only internal guard when a shared server-side admin role guard
  // is introduced.
  if (!isOwner(request)) {
    return errorResponse(403, "export_forbidden", "Owner access is required.");
  }

  const companyKey = request.nextUrl.searchParams.get("companyKey")?.trim().toLowerCase() ?? "";
  const startDate = request.nextUrl.searchParams.get("startDate")?.trim() ?? "";
  const endDate = request.nextUrl.searchParams.get("endDate")?.trim() ?? "";
  const format = request.nextUrl.searchParams.get("format")?.trim().toLowerCase() ?? "json";

  if (!companyKey) {
    return errorResponse(400, "company_key_required", "companyKey is required.");
  }

  if (!COMPANY_KEY_PATTERN.test(companyKey) || RESERVED_COMPANY_KEYS.has(companyKey)) {
    return errorResponse(400, "invalid_company_key", "companyKey must identify one specific company.");
  }

  if (!startDate) {
    return errorResponse(400, "start_date_required", "startDate is required.");
  }

  if (!endDate) {
    return errorResponse(400, "end_date_required", "endDate is required.");
  }

  const parsedStartDate = parseDate(startDate);
  const parsedEndDate = parseDate(endDate);

  if (!parsedStartDate || !parsedEndDate) {
    return errorResponse(400, "invalid_period", "startDate and endDate must use YYYY-MM-DD.");
  }

  if (parsedEndDate < parsedStartDate) {
    return errorResponse(400, "invalid_period", "endDate must not be earlier than startDate.");
  }

  if (format !== "json") {
    return errorResponse(400, "unsupported_format", "Export API v1 supports only format=json.");
  }

  const includeEvidence = parseBoolean(
    request.nextUrl.searchParams.get("includeEvidence"),
    "includeEvidence"
  );
  const includeNotionLinks = parseBoolean(
    request.nextUrl.searchParams.get("includeNotionLinks"),
    "includeNotionLinks"
  );

  if ("error" in includeEvidence) {
    return errorResponse(400, "invalid_include_evidence", includeEvidence.error);
  }

  if ("error" in includeNotionLinks) {
    return errorResponse(400, "invalid_include_notion_links", includeNotionLinks.error);
  }

  const dayAfterEnd = getDayAfter(parsedEndDate);
  const fieldQuery = new URLSearchParams({
    select: "*",
    tenant_code: `eq.${companyKey}`,
    or: buildPeriodFilter("created_at", "reported_date", startDate, endDate, dayAfterEnd),
    order: "created_at.asc",
  });
  const tbmQuery = new URLSearchParams({
    select: "*",
    company_code: `eq.${companyKey}`,
    or: buildPeriodFilter("created_at", "date_value", startDate, endDate, dayAfterEnd),
    order: "created_at.asc",
  });

  try {
    const [fieldRows, tbmRows] = await Promise.all([
      selectSupabaseExportRows<ExportRow>("field_participation_submissions", fieldQuery),
      selectSupabaseExportRows<ExportRow>("tbm_voice_submissions", tbmQuery),
    ]);
    const evidenceManifest = includeEvidence.value
      ? buildEvidenceManifest(fieldRows, tbmRows)
      : [];
    const fieldParticipation = includeNotionLinks.value
      ? fieldRows
      : fieldRows.map(withoutNotionLinks);
    const tbmVoiceSubmissions = includeNotionLinks.value
      ? tbmRows
      : tbmRows.map(withoutNotionLinks);

    return NextResponse.json({
      companyKey,
      period: { startDate, endDate },
      generatedAt: new Date().toISOString(),
      sources: {
        fieldParticipationCount: fieldParticipation.length,
        tbmVoiceCount: tbmVoiceSubmissions.length,
        evidenceCount: evidenceManifest.length,
      },
      fieldParticipation,
      tbmVoiceSubmissions,
      evidenceManifest,
    });
  } catch (error) {
    if (error instanceof SupabaseReadError && error.status === 0) {
      return errorResponse(503, "export_unavailable", "Export data source is not configured.");
    }

    console.error("[admin-export] Supabase read failed", {
      status: error instanceof SupabaseReadError ? error.status : undefined,
      statusText: error instanceof SupabaseReadError ? error.statusText : undefined,
    });

    return errorResponse(502, "export_query_failed", "Unable to read export data.");
  }
}
