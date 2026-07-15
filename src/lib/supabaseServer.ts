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

export type TbmVoiceSubmissionListRow = {
  id: string;
  company_code: string;
  title: string | null;
  date_value: string | null;
  created_at: string | null;
  supervisor_name: string | null;
  action_status: string | null;
  has_special_issue: boolean | null;
  safety_notice: string | null;
  normalized_text: string | null;
  draft_text: string | null;
  main_text: string | null;
  transcript: string | null;
  risk_tags: string[] | null;
  uploaded_file_count: number | null;
  snapshot: Record<string, unknown> | null;
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
  | "risk_share_sources"
  | "risk_share_item_candidates"
  | "risk_share_candidate_review_events"
  | "risk_share_items"
  | "risk_share_version_locks"
  | "tenant_registry"
  | "tenant_membership"
  | "tenant_sites";

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

export async function selectTbmVoiceSubmissionListRows(
  companyCode: string
): Promise<TbmVoiceSubmissionListRow[]> {
  const query = new URLSearchParams({
    select:
      "id,company_code,title,date_value,created_at,supervisor_name,action_status,has_special_issue,safety_notice,normalized_text,draft_text,main_text,transcript,risk_tags,uploaded_file_count,snapshot",
    company_code: `eq.${companyCode}`,
    order: "date_value.desc.nullslast,created_at.desc.nullslast",
    limit: "100",
  });

  return selectSupabaseExportRows<TbmVoiceSubmissionListRow>("tbm_voice_submissions", query);
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

export type RiskShareItemCandidateInsertRecord = {
  source_id: string;
  company_code: string;
  company_name: string | null;
  site_name: string | null;
  task_name: string;
  hazard: string;
  accident_type: string | null;
  risk_level: string | null;
  current_controls: string | null;
  improvement_plan: string | null;
  worker_share_summary: string | null;
  category: "common" | "non_common" | "site_specific" | "worker_signal" | "other";
  source_page: number | null;
  source_row: string | null;
  confidence: number | null;
  ai_generated: boolean;
  reviewer_status: "pending" | "accepted" | "edited" | "excluded" | "needs_customer_check";
  reviewer_note: string | null;
  worker_visible: boolean;
  customer_confirmed: boolean;
  raw_payload: Record<string, unknown>;
};

export async function insertRiskShareItemCandidateRecord(
  record: RiskShareItemCandidateInsertRecord
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

  const res = await fetch(`${supabaseUrl}/rest/v1/risk_share_item_candidates`, {
    method: "POST",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(record),
  });

  const data = await res.json().catch(() => undefined);

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      statusText: res.statusText,
      data,
    };
  }

  const message = typeof data?.message === "string" ? data.message : undefined;

  return {
    ok: false,
    status: res.status,
    statusText: res.statusText,
    message,
    data,
  };
}

export type RiskShareItemCandidateReviewerStatus =
  | "pending"
  | "accepted"
  | "edited"
  | "excluded"
  | "needs_customer_check";

export type RiskShareItemCandidateStatusUpdateRecord = {
  reviewer_status: RiskShareItemCandidateReviewerStatus;
  reviewer_note: string | null;
  worker_visible: boolean;
  customer_confirmed: boolean;
  raw_payload?: Record<string, unknown>;
  // Optional Owner review edits to the extracted/imported candidate fields.
  // Never AI-written by this path; only a human reviewer submits these.
  task_name?: string;
  hazard?: string;
  current_controls?: string | null;
  improvement_plan?: string | null;
  risk_level?: string | null;
  updated_at?: string;
};

export async function updateRiskShareItemCandidateReviewStatus(
  candidateId: string,
  companyCode: string,
  record: RiskShareItemCandidateStatusUpdateRecord
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

  const query = new URLSearchParams({
    id: `eq.${candidateId}`,
    company_code: `eq.${companyCode}`,
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/risk_share_item_candidates?${query.toString()}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(record),
  });

  const data = await res.json().catch(() => undefined);

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      statusText: res.statusText,
      data,
    };
  }

  const message = typeof data?.message === "string" ? data.message : undefined;

  return {
    ok: false,
    status: res.status,
    statusText: res.statusText,
    message,
    data,
  };
}

export type RiskShareCandidateReviewEventInsertRecord = {
  candidate_id: string;
  source_id: string | null;
  company_code: string;
  company_name: string | null;
  previous_status: RiskShareItemCandidateReviewerStatus | null;
  next_status: RiskShareItemCandidateReviewerStatus;
  reviewer_note: string | null;
  actor_type: "owner" | "system";
  actor_label: string | null;
  worker_visible: boolean;
  customer_confirmed: boolean;
  event_type: "status_change";
  raw_payload: Record<string, unknown>;
};

export async function insertRiskShareCandidateReviewEventRecord(
  record: RiskShareCandidateReviewEventInsertRecord
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

  const res = await fetch(`${supabaseUrl}/rest/v1/risk_share_candidate_review_events`, {
    method: "POST",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(record),
  });

  const data = await res.json().catch(() => undefined);

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      statusText: res.statusText,
      data,
    };
  }

  const message = typeof data?.message === "string" ? data.message : undefined;

  return {
    ok: false,
    status: res.status,
    statusText: res.statusText,
    message,
    data,
  };
}
export type RiskShareItemShareStatus =
  | "draft"
  | "needs_customer_check"
  | "customer_confirmed"
  | "locked"
  | "excluded";

export type RiskShareItemCustomerCheckStatus =
  | "not_requested"
  | "requested"
  | "confirmed"
  | "returned";

export type RiskShareItemInsertRecord = {
  source_id: string;
  candidate_id: string;
  company_code: string;
  company_name: string | null;
  site_name: string | null;
  task_name: string;
  hazard: string;
  accident_type: string | null;
  risk_level: string | null;
  current_controls: string | null;
  improvement_plan: string | null;
  worker_share_summary: string | null;
  category: "common" | "non_common" | "site_specific" | "worker_signal" | "other";
  share_status: RiskShareItemShareStatus;
  customer_check_status: RiskShareItemCustomerCheckStatus;
  customer_confirmed: boolean;
  worker_visible: boolean;
  version_lock_id: string | null;
  source_page: number | null;
  source_row: string | null;
  owner_note: string | null;
  customer_note: string | null;
  raw_payload: Record<string, unknown>;
};

export async function insertRiskShareItemRecord(
  record: RiskShareItemInsertRecord
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

  const res = await fetch(`${supabaseUrl}/rest/v1/risk_share_items`, {
    method: "POST",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(record),
  });

  const data = await res.json().catch(() => undefined);

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      statusText: res.statusText,
      data,
    };
  }

  const message = typeof data?.message === "string" ? data.message : undefined;

  return {
    ok: false,
    status: res.status,
    statusText: res.statusText,
    message,
    data,
  };
}

export type RiskShareItemCustomerCheckStatusUpdateRecord = {
  customer_check_status: RiskShareItemCustomerCheckStatus;
  customer_note: string | null;
  customer_confirmed: boolean;
  share_status: RiskShareItemShareStatus;
  updated_at: string;
};

export async function updateRiskShareItemCustomerCheckStatus(
  itemId: string,
  companyCode: string,
  record: RiskShareItemCustomerCheckStatusUpdateRecord
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

  const query = new URLSearchParams({
    id: `eq.${itemId}`,
    company_code: `eq.${companyCode}`,
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/risk_share_items?${query.toString()}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(record),
  });

  const data = await res.json().catch(() => undefined);

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      statusText: res.statusText,
      data,
    };
  }

  const message = typeof data?.message === "string" ? data.message : undefined;

  return {
    ok: false,
    status: res.status,
    statusText: res.statusText,
    message,
    data,
  };
}

export type RiskShareVersionLockStatus = "active" | "superseded" | "revoked";

export type RiskShareVersionLockInsertRecord = {
  company_code: string;
  company_name: string | null;
  site_name: string | null;
  source_title: string | null;
  lock_title: string;
  lock_month: string;
  item_count: number;
  customer_confirmed_count: number;
  worker_visible_count: number;
  lock_status: RiskShareVersionLockStatus;
  locked_by: string | null;
  notes: string | null;
  raw_payload: Record<string, unknown>;
};

export async function insertRiskShareVersionLockRecord(
  record: RiskShareVersionLockInsertRecord
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

  const res = await fetch(`${supabaseUrl}/rest/v1/risk_share_version_locks`, {
    method: "POST",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(record),
  });

  const data = await res.json().catch(() => undefined);

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      statusText: res.statusText,
      data,
    };
  }

  const message = typeof data?.message === "string" ? data.message : undefined;

  return {
    ok: false,
    status: res.status,
    statusText: res.statusText,
    message,
    data,
  };
}

export type RiskShareItemsVersionLockUpdateRecord = {
  share_status: "locked";
  version_lock_id: string;
  worker_visible: boolean;
  version_locked_at: string;
  updated_at: string;
};

export async function updateRiskShareItemsForVersionLock(
  itemIds: string[],
  companyCode: string,
  record: RiskShareItemsVersionLockUpdateRecord
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

  if (itemIds.length === 0) {
    return {
      ok: false,
      status: 400,
      statusText: "no_items",
      message: "No share items were selected.",
    };
  }

  const query = new URLSearchParams({
    id: `in.(${itemIds.join(",")})`,
    company_code: `eq.${companyCode}`,
    share_status: "eq.customer_confirmed",
    customer_check_status: "eq.confirmed",
    customer_confirmed: "eq.true",
    version_lock_id: "is.null",
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/risk_share_items?${query.toString()}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(record),
  });

  const data = await res.json().catch(() => undefined);

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      statusText: res.statusText,
      data,
    };
  }

  const message = typeof data?.message === "string" ? data.message : undefined;

  return {
    ok: false,
    status: res.status,
    statusText: res.statusText,
    message,
    data,
  };
}


export type TenantRegistryRow = {
  id?: string;
  company_code?: string | null;
  company_name?: string | null;
  status?: string | null;
  service_mode?: string | null;
  enabled_modules?: unknown;
  plan_type?: string | null;
  trial_start_date?: string | null;
  trial_end_date?: string | null;
  default_site_id?: string | null;
  default_site_name?: string | null;
  owner_notes?: string | null;
  source_channel?: string | null;
  contact_label?: string | null;
  raw_payload?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TenantRegistryConfig = {
  id: string;
  code: string;
  name: string;
  status: string;
  serviceMode: string;
  enabledModules: string[];
  planType: string | null;
  trialStartDate: string | null;
  trialEndDate: string | null;
  defaultSiteId: string | null;
  defaultSiteName: string | null;
  ownerNotes: string | null;
  sourceChannel: string | null;
  contactLabel: string | null;
  rawPayload: Record<string, unknown>;
};

function readTenantRegistryString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTenantRegistryModules(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => readTenantRegistryString(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeTenantRegistryModules(parsed);
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeTenantRegistryRawPayload(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export async function getTenantRegistryConfigByCode(rawCompanyCode: string) {
  const companyCode = rawCompanyCode.trim().toLowerCase();

  if (!companyCode) {
    return null;
  }

  const query = new URLSearchParams({
    select:
      "id,company_code,company_name,status,service_mode,enabled_modules,plan_type,trial_start_date,trial_end_date,default_site_id,default_site_name,owner_notes,source_channel,contact_label,raw_payload,created_at,updated_at",
    company_code: `eq.${companyCode}`,
    limit: "1",
  });

  const rows = await selectSupabaseExportRows<TenantRegistryRow>("tenant_registry", query);
  const row = rows[0] ?? null;

  if (!row) {
    return null;
  }

  const code = readTenantRegistryString(row.company_code);
  const name = readTenantRegistryString(row.company_name) || code;
  const status = readTenantRegistryString(row.status) || "onboarding";
  const serviceMode = readTenantRegistryString(row.service_mode);

  if (!code || !serviceMode) {
    return null;
  }

  return {
    id: readTenantRegistryString(row.id),
    code,
    name,
    status,
    serviceMode,
    enabledModules: normalizeTenantRegistryModules(row.enabled_modules),
    planType: readTenantRegistryString(row.plan_type) || null,
    trialStartDate: readTenantRegistryString(row.trial_start_date) || null,
    trialEndDate: readTenantRegistryString(row.trial_end_date) || null,
    defaultSiteId: readTenantRegistryString(row.default_site_id) || null,
    defaultSiteName: readTenantRegistryString(row.default_site_name) || null,
    ownerNotes: readTenantRegistryString(row.owner_notes) || null,
    sourceChannel: readTenantRegistryString(row.source_channel) || null,
    contactLabel: readTenantRegistryString(row.contact_label) || null,
    rawPayload: normalizeTenantRegistryRawPayload(row.raw_payload),
  } satisfies TenantRegistryConfig;
}

export type TenantSiteRow = {
  id?: string;
  tenant_id?: string | null;
  tenant_code?: string | null;
  site_name?: string | null;
  is_default?: boolean | null;
  status?: string | null;
  industry_profile?: string | null;
  major_processes?: string[] | null;
  major_equipment?: string[] | null;
  worker_count_band?: string | null;
  uses_external_workforce?: boolean | null;
  has_worker_representative?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TenantSiteConfig = {
  id: string;
  tenantId: string;
  tenantCode: string;
  siteName: string;
  isDefault: boolean;
  status: "active" | "archived";
  /** Null means not yet set. Never defaulted to a placeholder string. */
  industryProfile: string | null;
  /** Null means not yet set. Never defaulted to an empty array. */
  majorProcesses: string[] | null;
  /** Null means not yet set. Never defaulted to an empty array. */
  majorEquipment: string[] | null;
  /** Null means not yet set. Never defaulted to a placeholder string. */
  workerCountBand: string | null;
  /** Null means not yet confirmed. False means confirmed "no". Never defaulted. */
  usesExternalWorkforce: boolean | null;
  /** Null means not yet confirmed. False means confirmed "no". Never defaulted. */
  hasWorkerRepresentative: boolean | null;
};

const TENANT_SITE_SELECT_COLUMNS =
  "id,tenant_id,tenant_code,site_name,is_default,status,industry_profile,major_processes,major_equipment,worker_count_band,uses_external_workforce,has_worker_representative,created_at,updated_at";

function readTenantSiteStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value.map((item) => readTenantRegistryString(item)).filter(Boolean);

  return items.length > 0 ? items : null;
}

function readTenantSiteStatus(value: unknown): "active" | "archived" {
  return readTenantRegistryString(value) === "archived" ? "archived" : "active";
}

function toTenantSiteConfig(row: TenantSiteRow): TenantSiteConfig | null {
  const id = readTenantRegistryString(row.id);
  const tenantId = readTenantRegistryString(row.tenant_id);
  const tenantCode = readTenantRegistryString(row.tenant_code);
  const siteName = readTenantRegistryString(row.site_name);

  if (!id || !tenantId || !tenantCode || !siteName) {
    return null;
  }

  return {
    id,
    tenantId,
    tenantCode,
    siteName,
    isDefault: row.is_default === true,
    status: readTenantSiteStatus(row.status),
    industryProfile: readTenantRegistryString(row.industry_profile) || null,
    majorProcesses: readTenantSiteStringArray(row.major_processes),
    majorEquipment: readTenantSiteStringArray(row.major_equipment),
    workerCountBand: readTenantRegistryString(row.worker_count_band) || null,
    usesExternalWorkforce:
      typeof row.uses_external_workforce === "boolean" ? row.uses_external_workforce : null,
    hasWorkerRepresentative:
      typeof row.has_worker_representative === "boolean" ? row.has_worker_representative : null,
  } satisfies TenantSiteConfig;
}

/** Every site for a tenant, most recently created first. Used by the Owner
 * site management screen only -- manager reads use
 * getDefaultTenantSiteConfigByTenantCode below, never the full list. */
export async function listTenantSitesByTenantCode(tenantCode: string): Promise<TenantSiteConfig[]> {
  const normalizedCode = tenantCode.trim().toLowerCase();

  if (!normalizedCode) {
    return [];
  }

  const query = new URLSearchParams({
    select: TENANT_SITE_SELECT_COLUMNS,
    tenant_code: `eq.${normalizedCode}`,
    order: "created_at.desc",
    limit: "200",
  });

  const rows = await selectSupabaseExportRows<TenantSiteRow>("tenant_sites", query);

  return rows
    .map((row) => toTenantSiteConfig(row))
    .filter((site): site is TenantSiteConfig => site !== null);
}

/** The tenant's single active default site, or null if none exists yet.
 * Used by both the manager read-only profile status and the Owner
 * activation gate -- never trusts tenant_registry.default_site_name alone,
 * since that field is only a compatibility mirror synced by the
 * create_tenant_default_site / set_tenant_default_site RPCs. */
export async function getDefaultTenantSiteConfigByTenantCode(
  tenantCode: string
): Promise<TenantSiteConfig | null> {
  const normalizedCode = tenantCode.trim().toLowerCase();

  if (!normalizedCode) {
    return null;
  }

  const query = new URLSearchParams({
    select: TENANT_SITE_SELECT_COLUMNS,
    tenant_code: `eq.${normalizedCode}`,
    is_default: "eq.true",
    status: "eq.active",
    limit: "1",
  });

  const rows = await selectSupabaseExportRows<TenantSiteRow>("tenant_sites", query);
  const row = rows[0];

  return row ? toTenantSiteConfig(row) : null;
}

export type TenantMembershipRole =
  | "owner_internal"
  | "tenant_admin"
  | "tenant_manager"
  | "tenant_representative"
  | "tenant_viewer";

export type TenantMembershipStatus =
  | "invited"
  | "active"
  | "suspended"
  | "revoked";

export type TenantMembershipRow = {
  id?: unknown;
  tenant_id?: unknown;
  tenant_code?: unknown;
  user_id?: unknown;
  user_email?: unknown;
  display_name?: unknown;
  role?: unknown;
  status?: unknown;
  invited_by?: unknown;
  accepted_at?: unknown;
  revoked_at?: unknown;
  last_seen_at?: unknown;
  raw_payload?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

export type TenantMembershipConfig = {
  id: string | null;
  tenantId: string;
  tenantCode: string;
  userId: string | null;
  userEmail: string;
  displayName: string | null;
  role: TenantMembershipRole;
  status: TenantMembershipStatus;
  invitedBy: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  lastSeenAt: string | null;
  rawPayload: Record<string, unknown>;
};

function normalizeTenantMembershipEmail(value: string) {
  return value.trim().toLowerCase().slice(0, 320);
}

function normalizeTenantMembershipCode(value: string) {
  const code = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 64);

  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(code) ? code : "";
}

function normalizeTenantMembershipRole(value: unknown): TenantMembershipRole | null {
  const role = readTenantRegistryString(value);

  switch (role) {
    case "owner_internal":
    case "tenant_admin":
    case "tenant_manager":
    case "tenant_representative":
    case "tenant_viewer":
      return role;
    default:
      return null;
  }
}

function normalizeTenantMembershipStatus(value: unknown): TenantMembershipStatus | null {
  const status = readTenantRegistryString(value);

  switch (status) {
    case "invited":
    case "active":
    case "suspended":
    case "revoked":
      return status;
    default:
      return null;
  }
}

function normalizeTenantMembershipRawPayload(value: unknown): Record<string, unknown> {
  return normalizeTenantRegistryRawPayload(value);
}

export async function getActiveTenantMembershipByEmailAndCode(params: {
  userEmail: string;
  tenantCode: string;
}): Promise<TenantMembershipConfig | null> {
  const userEmail = normalizeTenantMembershipEmail(params.userEmail);
  const tenantCode = normalizeTenantMembershipCode(params.tenantCode);

  if (!userEmail || !tenantCode) {
    return null;
  }

  const query = new URLSearchParams({
    select:
      "id,tenant_id,tenant_code,user_id,user_email,display_name,role,status,invited_by,accepted_at,revoked_at,last_seen_at,raw_payload,created_at,updated_at",
    tenant_code: `eq.${tenantCode}`,
    user_email: `ilike.${userEmail}`,
    status: "eq.active",
    limit: "1",
  });

  const rows = await selectSupabaseExportRows<TenantMembershipRow>("tenant_membership", query);
  const row = rows[0];

  if (!row) {
    return null;
  }

  const rowTenantId = readTenantRegistryString(row.tenant_id);
  const rowTenantCode = readTenantRegistryString(row.tenant_code);
  const rowUserEmail = normalizeTenantMembershipEmail(readTenantRegistryString(row.user_email));
  const role = normalizeTenantMembershipRole(row.role);
  const status = normalizeTenantMembershipStatus(row.status);

  if (
    !rowTenantId ||
    rowTenantCode !== tenantCode ||
    rowUserEmail !== userEmail ||
    !role ||
    status !== "active"
  ) {
    return null;
  }

  return {
    id: readTenantRegistryString(row.id),
    tenantId: rowTenantId,
    tenantCode: rowTenantCode,
    userId: readTenantRegistryString(row.user_id) || null,
    userEmail: rowUserEmail,
    displayName: readTenantRegistryString(row.display_name) || null,
    role,
    status,
    invitedBy: readTenantRegistryString(row.invited_by) || null,
    acceptedAt: readTenantRegistryString(row.accepted_at) || null,
    revokedAt: readTenantRegistryString(row.revoked_at) || null,
    lastSeenAt: readTenantRegistryString(row.last_seen_at) || null,
    rawPayload: normalizeTenantMembershipRawPayload(row.raw_payload),
  } satisfies TenantMembershipConfig;
}

export type ManagerCapableTenantMembershipRole = Extract<
  TenantMembershipRole,
  "owner_internal" | "tenant_admin" | "tenant_manager"
>;

export type ActiveManagerTenantMembershipDestination = {
  tenantCode: string;
  role: ManagerCapableTenantMembershipRole;
};

function isManagerCapableTenantMembershipRole(
  role: TenantMembershipRole
): role is ManagerCapableTenantMembershipRole {
  return role === "owner_internal" || role === "tenant_admin" || role === "tenant_manager";
}

const ACTIVE_MANAGER_TENANT_MEMBERSHIP_LOOKUP_LIMIT = 2;

export async function listActiveManagerTenantMembershipsByEmail(
  userEmail: string
): Promise<ActiveManagerTenantMembershipDestination[]> {
  const normalizedEmail = normalizeTenantMembershipEmail(userEmail);

  if (!normalizedEmail) {
    return [];
  }

  const query = new URLSearchParams({
    select: "tenant_code,user_email,role,status",
    user_email: `ilike.${normalizedEmail}`,
    status: "eq.active",
    role: "in.(owner_internal,tenant_admin,tenant_manager)",
    order: "tenant_code.asc",
    limit: String(ACTIVE_MANAGER_TENANT_MEMBERSHIP_LOOKUP_LIMIT),
  });

  const rows = await selectSupabaseExportRows<TenantMembershipRow>("tenant_membership", query);

  const seenTenantCodes = new Set<string>();
  const destinations: ActiveManagerTenantMembershipDestination[] = [];

  for (const row of rows) {
    const tenantCode = normalizeTenantMembershipCode(readTenantRegistryString(row.tenant_code));
    const rowUserEmail = normalizeTenantMembershipEmail(readTenantRegistryString(row.user_email));
    const role = normalizeTenantMembershipRole(row.role);
    const status = normalizeTenantMembershipStatus(row.status);

    if (
      !tenantCode ||
      rowUserEmail !== normalizedEmail ||
      !role ||
      !isManagerCapableTenantMembershipRole(role) ||
      status !== "active"
    ) {
      continue;
    }

    if (seenTenantCodes.has(tenantCode)) {
      continue;
    }

    seenTenantCodes.add(tenantCode);
    destinations.push({ tenantCode, role });
  }

  return destinations.slice(0, ACTIVE_MANAGER_TENANT_MEMBERSHIP_LOOKUP_LIMIT);
}
