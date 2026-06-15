import "server-only";

type SupabaseInsertResult = {
  ok: boolean;
  status: number;
  statusText: string;
  message?: string;
  data?: unknown;
};

type UploadedTbmShadowFile = {
  name: string;
  url: string;
};

export type TbmVoiceSubmissionShadowRecord = {
  company_code: string;
  company_name: string;
  notion_tbm_db_id: string;
  notion_page_id: string | null;
  notion_page_url: string | null;
  date_value: string;
  start_time: string;
  end_time: string;
  voice_intent: string;
  title: string;
  transcript: string;
  draft_text: string;
  main_text: string;
  normalized_text: string;
  supervisor_name: string;
  work_type: string;
  work_types: string[];
  work_tags: string[];
  risk_tags: string[];
  safety_notice: string;
  has_special_issue: boolean;
  special_issue_content: string;
  action_status: string;
  selected_file_count: number;
  uploaded_file_count: number;
  uploaded_files: Record<string, UploadedTbmShadowFile[]>;
  notion_properties_snapshot: Record<string, unknown>;
  snapshot: Record<string, unknown>;
};


export type FieldParticipationSubmissionShadowRecord = {
  tenant_code: string;
  company_name: string;
  submission_type: string;
  legacy_type: string;
  title: string;
  content: string;
  location: string;
  submitter: string;
  anonymous: boolean;
  reported_date: string;
  status: string;
  notion_page_id: string | null;
  notion_url: string | null;
  file_urls: string[];
  raw_payload: Record<string, unknown>;
};


export type EvidenceItemMetadataRecord = {
  company_code: string;
  company_name: string | null;
  site_id: string | null;
  site_name: string | null;
  source_type: string;
  source_record_table: string | null;
  source_record_id: string | null;
  submission_type: string | null;
  file_url: string;
  file_name: string | null;
  file_mime_type: string | null;
  file_size: number | null;
  evidence_role: string | null;
  storage_provider: string;
  submitted_at: string | null;
  submitted_by_label: string | null;
  anonymous: boolean;
  action_id?: string | null;
  evidence_type_code?: string;
  verified?: boolean;
  raw_payload: Record<string, unknown>;
};

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.replace(/\/+$/, "");
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function getSupabaseTbmShadowWriteCompanies() {
  return new Set(
    (process.env.SUPABASE_TBM_SHADOW_WRITE_COMPANIES ?? "")
      .split(",")
      .map((companyCode) => companyCode.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isSupabaseTbmShadowWriteEnabled(companyCode: string) {
  if (process.env.SUPABASE_TBM_SHADOW_WRITE_ENABLED !== "true") {
    return false;
  }

  return getSupabaseTbmShadowWriteCompanies().has(companyCode.toLowerCase());
}


function getSupabaseFieldParticipationShadowWriteCompanies() {
  return new Set(
    (process.env.SUPABASE_FIELD_PARTICIPATION_SHADOW_WRITE_COMPANIES ?? "")
      .split(",")
      .map((companyCode) => companyCode.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isSupabaseFieldParticipationShadowWriteEnabled(companyCode: string) {
  if (process.env.SUPABASE_FIELD_PARTICIPATION_SHADOW_WRITE_ENABLED !== "true") {
    return false;
  }

  return getSupabaseFieldParticipationShadowWriteCompanies().has(companyCode.toLowerCase());
}


type SupabaseExportTable =
  | "field_participation_submissions"
  | "tbm_voice_submissions"
  | "worker_representative_confirmations"
  | "evidence_items"
  | "risk_share_item_candidates";

export class SupabaseReadError extends Error {
  status: number;
  statusText: string;

  constructor(status: number, statusText: string, message: string) {
    super(message);
    this.name = "SupabaseReadError";
    this.status = status;
    this.statusText = statusText;
  }
}

const SUPABASE_EXPORT_PAGE_SIZE = 1000;

export async function selectSupabaseExportRows<T extends Record<string, unknown>>(
  table: SupabaseExportTable,
  query: URLSearchParams
): Promise<T[]> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new SupabaseReadError(
      0,
      "missing_supabase_server_config",
      "Supabase server configuration is missing."
    );
  }

  const rows: T[] = [];

  for (let offset = 0; ; offset += SUPABASE_EXPORT_PAGE_SIZE) {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${query.toString()}`, {
      method: "GET",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        Range: `${offset}-${offset + SUPABASE_EXPORT_PAGE_SIZE - 1}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => undefined);
      const message =
        typeof data?.message === "string"
          ? data.message
          : "Supabase export query failed.";

      throw new SupabaseReadError(res.status, res.statusText, message);
    }

    const page = (await res.json()) as T[];
    rows.push(...page);

    if (page.length < SUPABASE_EXPORT_PAGE_SIZE) {
      return rows;
    }
  }
}

export async function insertTbmVoiceSubmissionShadowRecord(
  record: TbmVoiceSubmissionShadowRecord
): Promise<SupabaseInsertResult> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      ok: false,
      status: 0,
      statusText: "missing_supabase_server_config",
      message: "Supabase server configuration is missing.",
    };
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/tbm_voice_submissions`, {
    method: "POST",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(record),
  });

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      statusText: res.statusText,
    };
  }

  const data = await res.json().catch(() => undefined);
  const message = typeof data?.message === "string" ? data.message : undefined;

  return {
    ok: false,
    status: res.status,
    statusText: res.statusText,
    message,
  };
}

export async function insertFieldParticipationSubmissionShadowRecord(
  record: FieldParticipationSubmissionShadowRecord
): Promise<SupabaseInsertResult> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      ok: false,
      status: 0,
      statusText: "missing_supabase_server_config",
      message: "Supabase server configuration is missing.",
    };
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/field_participation_submissions`, {
    method: "POST",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
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
  };
}


export async function insertEvidenceItemMetadataRecords(
  records: EvidenceItemMetadataRecord[]
): Promise<SupabaseInsertResult> {
  if (records.length === 0) {
    return {
      ok: true,
      status: 204,
      statusText: "no_evidence_items",
    };
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      ok: false,
      status: 0,
      statusText: "missing_supabase_server_config",
      message: "Supabase server configuration is missing.",
    };
  }

  const normalizedRecords = records.map((record) => ({
    ...record,
    action_id: record.action_id ?? null,
    evidence_type_code: record.evidence_type_code ?? "photo",
    verified: record.verified ?? false,
  }));

  const res = await fetch(`${supabaseUrl}/rest/v1/evidence_items`, {
    method: "POST",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(normalizedRecords),
  });

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      statusText: res.statusText,
    };
  }

  const data = await res.json().catch(() => undefined);
  const message = typeof data?.message === "string" ? data.message : undefined;

  return {
    ok: false,
    status: res.status,
    statusText: res.statusText,
    message,
  };
}
