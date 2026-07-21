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
  | "risk_share_confirmation_review_events"
  | "risk_share_inbox_review_events"
  | "risk_share_items"
  | "risk_share_version_locks"
  | "risk_share_version_items"
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

export type TenantSiteRpcResult = {
  ok: boolean;
  id: string | null;
  reason: string;
};

type TenantSiteRpcRow = {
  id?: unknown;
  ok?: unknown;
  reason?: unknown;
};

function normalizeTenantSiteRpcResult(data: unknown): TenantSiteRpcResult {
  const row = Array.isArray(data) ? (data[0] as TenantSiteRpcRow | undefined) : (data as TenantSiteRpcRow | undefined);

  return {
    ok: row?.ok === true,
    id: readTenantRegistryString(row?.id) || null,
    reason: readTenantRegistryString(row?.reason) || "unknown",
  };
}

async function callTenantSiteRpc(
  rpcName: "create_tenant_default_site" | "update_tenant_site_profile",
  payload: Record<string, unknown>,
): Promise<TenantSiteRpcResult> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { ok: false, id: null, reason: "not_configured" };
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => undefined);
    const rawMessage =
      errorData && typeof errorData === "object" && !Array.isArray(errorData)
        && typeof (errorData as { message?: unknown }).message === "string"
        ? (errorData as { message: string }).message
        : "";

    const safeMessage = rawMessage
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "[uuid]")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
      .replace(/https?:\/\/\S+/gi, "[url]")
      .slice(0, 240);

    const errorCode =
      errorData && typeof errorData === "object" && !Array.isArray(errorData)
        && typeof (errorData as { code?: unknown }).code === "string"
        ? (errorData as { code: string }).code
        : null;

    console.error("[tenant-site-rpc] request failed", {
      rpcName,
      status: res.status,
      statusText: res.statusText,
      errorCode,
      safeMessage: safeMessage || null,
      tenantIdFormatValid:
        typeof payload.p_tenant_id === "string"
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.p_tenant_id),
      tenantCodePresent:
        typeof payload.p_tenant_code === "string"
        && payload.p_tenant_code.length > 0,
      siteNameLength:
        typeof payload.p_site_name === "string"
          ? payload.p_site_name.length
          : null,
    });

    return { ok: false, id: null, reason: "request_failed" };
  }

  const data = await res.json().catch(() => undefined);
  const result = normalizeTenantSiteRpcResult(data);

  if (result.reason === "unknown") {
    console.error("[tenant-site-rpc] unexpected response", {
      rpcName,
      status: res.status,
      responseKind: Array.isArray(data) ? "array" : typeof data,
      rowCount: Array.isArray(data) ? data.length : undefined,
    });
  }

  return result;
}

export async function createTenantDefaultSite(params: {
  tenantId: string;
  tenantCode: string;
  siteName: string;
}): Promise<TenantSiteRpcResult> {
  return callTenantSiteRpc("create_tenant_default_site", {
    p_tenant_id: params.tenantId,
    p_tenant_code: params.tenantCode,
    p_site_name: params.siteName,
  });
}

export async function updateTenantSiteProfile(params: {
  tenantId: string;
  siteId: string;
  siteName: string;
  industryProfile: string;
  majorProcesses: string[];
  majorEquipment: string[];
  workerCountBand: string;
  usesExternalWorkforce: boolean;
  hasWorkerRepresentative: boolean;
}): Promise<TenantSiteRpcResult> {
  return callTenantSiteRpc("update_tenant_site_profile", {
    p_tenant_id: params.tenantId,
    p_site_id: params.siteId,
    p_site_name: params.siteName,
    p_industry_profile: params.industryProfile,
    p_major_processes: params.majorProcesses,
    p_major_equipment: params.majorEquipment,
    p_worker_count_band: params.workerCountBand,
    p_uses_external_workforce: params.usesExternalWorkforce,
    p_has_worker_representative: params.hasWorkerRepresentative,
  });
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
  /** tenant_membership.id -- always a non-empty membership row PK. A row
   * without one is not treated as a valid active membership; see the
   * fail-closed check in getActiveTenantMembershipByEmailAndCode. */
  id: string;
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

  const rowId = readTenantRegistryString(row.id);
  const rowTenantId = readTenantRegistryString(row.tenant_id);
  const rowTenantCode = readTenantRegistryString(row.tenant_code);
  const rowUserEmail = normalizeTenantMembershipEmail(readTenantRegistryString(row.user_email));
  const role = normalizeTenantMembershipRole(row.role);
  const status = normalizeTenantMembershipStatus(row.status);

  if (
    !rowId ||
    !rowTenantId ||
    rowTenantCode !== tenantCode ||
    rowUserEmail !== userEmail ||
    !role ||
    status !== "active"
  ) {
    return null;
  }

  return {
    id: rowId,
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

export type SafeReviewedRiskShareItem = {
  id: string;
  companyCode: string;
  taskName: string | null;
  hazard: string | null;
  currentControls: string | null;
  improvementPlan: string | null;
  riskLevel: string | null;
  workerShareSummary: string | null;
  shareStatus: string;
  customerCheckStatus: string;
  customerConfirmed: boolean;
  workerVisible: boolean;
  versionLockId: string | null;
  reviewRevision: number;
};

export type ReviewRiskShareItemCode =
  | "ok"
  | "invalid_action"
  | "validation_failed"
  | "forbidden"
  | "not_found"
  | "locked"
  | "idempotency_conflict"
  | "stale_revision"
  | "request_failed"
  | "invalid_response";

export type ReviewRiskShareItemResult = {
  ok: boolean;
  code: ReviewRiskShareItemCode;
  replayed: boolean;
  item: SafeReviewedRiskShareItem | null;
  reviewEventId: string | null;
};

export type ReviewRiskShareItemAction = "include" | "edit_include" | "exclude";

export type ReviewRiskShareItemParams = {
  itemId: string;
  companyCode: string;
  actorMembershipId: string;
  expectedRevision: number;
  action: ReviewRiskShareItemAction;
  idempotencyKey: string;
  taskName: string | null;
  hazard: string | null;
  currentControls: string | null;
  improvementPlan: string | null;
  riskLevel: string | null;
  workerShareSummary: string | null;
  workerVisible: boolean | null;
};

const REVIEW_RISK_SHARE_ITEM_KNOWN_CODES = new Set<string>([
  "ok",
  "invalid_action",
  "validation_failed",
  "forbidden",
  "not_found",
  "locked",
  "idempotency_conflict",
  "stale_revision",
]);

function scrubSupabaseRpcErrorMessage(rawMessage: string): string {
  return rawMessage
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "[uuid]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .slice(0, 240);
}

const REVIEWED_ITEM_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REVIEWED_ITEM_COMPANY_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const REVIEWED_ITEM_KNOWN_SHARE_STATUSES = new Set([
  "draft",
  "needs_customer_check",
  "customer_confirmed",
  "locked",
  "excluded",
]);
const REVIEWED_ITEM_KNOWN_CUSTOMER_CHECK_STATUSES = new Set([
  "not_requested",
  "requested",
  "confirmed",
  "returned",
]);

/** Strict, fail-closed parse of the RPC's `item` snapshot. Every field is
 * checked against its real DB shape (UUID pattern, known enum, integer
 * revision) -- an unexpected shape here means something is wrong between
 * this helper and the RPC's actual contract, not a value worth passing
 * through best-effort. */
function toSafeReviewedRiskShareItem(value: unknown): SafeReviewedRiskShareItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = readTenantRegistryString(row.id);
  const companyCode = readTenantRegistryString(row.companyCode);
  const shareStatus = readTenantRegistryString(row.shareStatus);
  const customerCheckStatus = readTenantRegistryString(row.customerCheckStatus);
  const reviewRevision = row.reviewRevision;
  const versionLockId = readTenantRegistryString(row.versionLockId);

  if (
    !REVIEWED_ITEM_UUID_PATTERN.test(id) ||
    !REVIEWED_ITEM_COMPANY_CODE_PATTERN.test(companyCode) ||
    !REVIEWED_ITEM_KNOWN_SHARE_STATUSES.has(shareStatus) ||
    !REVIEWED_ITEM_KNOWN_CUSTOMER_CHECK_STATUSES.has(customerCheckStatus) ||
    typeof row.customerConfirmed !== "boolean" ||
    typeof row.workerVisible !== "boolean" ||
    typeof reviewRevision !== "number" ||
    !Number.isInteger(reviewRevision) ||
    reviewRevision < 1 ||
    (versionLockId && !REVIEWED_ITEM_UUID_PATTERN.test(versionLockId))
  ) {
    return null;
  }

  const readNullableText = (input: unknown) =>
    typeof input === "string" && input.trim() ? input : null;

  return {
    id,
    companyCode,
    taskName: readNullableText(row.taskName),
    hazard: readNullableText(row.hazard),
    currentControls: readNullableText(row.currentControls),
    improvementPlan: readNullableText(row.improvementPlan),
    riskLevel: readNullableText(row.riskLevel),
    workerShareSummary: readNullableText(row.workerShareSummary),
    shareStatus,
    customerCheckStatus,
    customerConfirmed: row.customerConfirmed,
    workerVisible: row.workerVisible,
    versionLockId: versionLockId || null,
    reviewRevision,
  };
}

/** Server-only call to the review_risk_share_item Postgres RPC (added in
 * 20260716010000, privileges hardened in 20260716020000). This is the only
 * write path onto risk_share_items for tenant Share Review: the RPC alone
 * validates membership, locks the item row, enforces optimistic
 * concurrency, and writes the risk_share_item_review_events audit row --
 * this helper must never PATCH risk_share_items or insert into the audit
 * table directly. */
export async function reviewRiskShareItemForTenant(
  params: ReviewRiskShareItemParams
): Promise<ReviewRiskShareItemResult> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceRoleKey = getSupabaseServiceRoleKey();

  const failClosed = (code: ReviewRiskShareItemCode): ReviewRiskShareItemResult => ({
    ok: false,
    code,
    replayed: false,
    item: null,
    reviewEventId: null,
  });

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return failClosed("request_failed");
  }

  let res: Response;

  try {
    res = await fetch(`${supabaseUrl}/rest/v1/rpc/review_risk_share_item`, {
      method: "POST",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        p_item_id: params.itemId,
        p_company_code: params.companyCode,
        p_actor_membership_id: params.actorMembershipId,
        p_expected_revision: params.expectedRevision,
        p_action: params.action,
        p_idempotency_key: params.idempotencyKey,
        p_task_name: params.taskName,
        p_hazard: params.hazard,
        p_current_controls: params.currentControls,
        p_improvement_plan: params.improvementPlan,
        p_risk_level: params.riskLevel,
        p_worker_share_summary: params.workerShareSummary,
        p_worker_visible: params.workerVisible,
      }),
      cache: "no-store",
    });
  } catch {
    return failClosed("request_failed");
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => undefined);
    const rawMessage =
      errorData && typeof errorData === "object" && !Array.isArray(errorData)
        && typeof (errorData as { message?: unknown }).message === "string"
        ? (errorData as { message: string }).message
        : "";
    const errorCode =
      errorData && typeof errorData === "object" && !Array.isArray(errorData)
        && typeof (errorData as { code?: unknown }).code === "string"
        ? (errorData as { code: string }).code
        : null;

    console.error("[review-risk-share-item-rpc] request failed", {
      status: res.status,
      statusText: res.statusText,
      errorCode,
      safeMessage: scrubSupabaseRpcErrorMessage(rawMessage) || null,
      action: params.action,
    });

    return failClosed("request_failed");
  }

  const data = await res.json().catch(() => undefined);
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    console.error("[review-risk-share-item-rpc] unexpected response shape", {
      responseKind: Array.isArray(data) ? "array" : typeof data,
      rowCount: Array.isArray(data) ? data.length : undefined,
    });

    return failClosed("invalid_response");
  }

  const rawRow = row as Record<string, unknown>;
  const code = readTenantRegistryString(rawRow.code);

  if (typeof rawRow.ok !== "boolean" || typeof rawRow.replayed !== "boolean") {
    console.error("[review-risk-share-item-rpc] ok/replayed not boolean", {
      okType: typeof rawRow.ok,
      replayedType: typeof rawRow.replayed,
    });

    return failClosed("invalid_response");
  }

  const ok = rawRow.ok;
  const replayed = rawRow.replayed;

  if (!REVIEW_RISK_SHARE_ITEM_KNOWN_CODES.has(code)) {
    console.error("[review-risk-share-item-rpc] unknown result code", { code: code || null });

    return failClosed("invalid_response");
  }

  // ok and code are two ways of expressing the same outcome; the RPC must
  // never disagree with itself about whether the call succeeded.
  if (ok !== (code === "ok")) {
    console.error("[review-risk-share-item-rpc] ok/code disagree", { ok, code });

    return failClosed("invalid_response");
  }

  const item = ok ? toSafeReviewedRiskShareItem(rawRow.item) : null;

  if (ok && !item) {
    console.error("[review-risk-share-item-rpc] ok=true with missing/malformed item snapshot");

    return failClosed("invalid_response");
  }

  const reviewEventIdRaw = readTenantRegistryString(rawRow.review_event_id);
  const reviewEventId = reviewEventIdRaw || null;

  if (ok) {
    const normalizedRequestCompanyCode = params.companyCode.trim().toLowerCase();
    // Postgres always returns uuid columns lowercased; a client-submitted
    // itemId may not be, so compare case-insensitively rather than risk a
    // false invalid_response over casing alone.
    const itemIdMatches = item!.id.toLowerCase() === params.itemId.trim().toLowerCase();
    const companyCodeMatches = item!.companyCode === normalizedRequestCompanyCode;
    const hasValidReviewEventId =
      Boolean(reviewEventIdRaw) && REVIEWED_ITEM_UUID_PATTERN.test(reviewEventIdRaw);

    // A successful mutation must be reporting back on the exact item and
    // tenant this call asked about, and must carry a real audit event id --
    // any mismatch means the response cannot be trusted to describe this
    // request, regardless of what the RPC otherwise claims.
    if (!itemIdMatches || !companyCodeMatches || !hasValidReviewEventId) {
      console.error("[review-risk-share-item-rpc] ok=true response does not match the request", {
        itemIdMatches,
        companyCodeMatches,
        hasValidReviewEventId,
      });

      return failClosed("invalid_response");
    }
  }

  return {
    ok,
    code: code as ReviewRiskShareItemCode,
    replayed,
    item,
    reviewEventId,
  };
}

export type PrepareRiskShareItemsCandidateResultCode =
  | "created"
  | "replayed"
  | "item_already_exists"
  | "idempotency_conflict"
  | "not_eligible"
  | "invalid_candidate";

export type PrepareRiskShareItemsStructuralCode =
  | "invalid_request"
  | "forbidden"
  | "source_not_found"
  | "too_many_candidates";

export type PrepareRiskShareItemsCode =
  | "ok"
  | PrepareRiskShareItemsStructuralCode
  | "request_failed"
  | "invalid_response";

export type PrepareRiskShareItemsDecision = "auto_prepared" | "owner_exception_required";

export type PrepareRiskShareItemsReasonCode =
  | "AUTO_SOURCE_FAITHFUL"
  | "MISSING_REQUIRED_FIELD"
  | "MAPPING_CONFLICT";

export type PrepareRiskShareItemsCandidateResult = {
  candidateId: string;
  resultCode: PrepareRiskShareItemsCandidateResultCode;
  decision: PrepareRiskShareItemsDecision | null;
  reasonCode: PrepareRiskShareItemsReasonCode | null;
  /** Internal linkage only -- validated here, never forwarded outward by
   * the route (see the A2 preparation API's outward response allowlist). */
  itemId: string | null;
  decisionId: string | null;
};

export type PrepareRiskShareItemsParams = {
  companyCode: string;
  sourceId: string;
  actorMembershipId: string;
  idempotencyKey: string;
  /** Always an explicit, non-empty, <=200-item array -- this helper never
   * sends p_candidate_ids = null. Bulk-all-eligible processing is out of
   * scope for the A2 preparation API. */
  candidateIds: string[];
};

export type PrepareRiskShareItemsResult =
  | { ok: true; code: "ok"; results: PrepareRiskShareItemsCandidateResult[] }
  | { ok: false; code: Exclude<PrepareRiskShareItemsCode, "ok">; results: null };

const PREPARE_RISK_SHARE_ITEMS_MAX_CANDIDATES = 200;

const PREPARE_RISK_SHARE_ITEMS_STRUCTURAL_CODES = new Set<string>([
  "invalid_request",
  "forbidden",
  "source_not_found",
  "too_many_candidates",
]);

const PREPARE_RISK_SHARE_ITEMS_CANDIDATE_CODES = new Set<string>([
  "created",
  "replayed",
  "item_already_exists",
  "idempotency_conflict",
  "not_eligible",
  "invalid_candidate",
]);

const PREPARE_RISK_SHARE_ITEMS_KNOWN_DECISIONS = new Set<string>([
  "auto_prepared",
  "owner_exception_required",
]);

const PREPARE_RISK_SHARE_ITEMS_KNOWN_REASON_CODES = new Set<string>([
  "AUTO_SOURCE_FAITHFUL",
  "MISSING_REQUIRED_FIELD",
  "MAPPING_CONFLICT",
]);

const PREPARE_RISK_SHARE_ITEMS_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PrepareRiskShareItemsRawRow = {
  candidate_id?: unknown;
  decision?: unknown;
  reason_code?: unknown;
  item_id?: unknown;
  decision_id?: unknown;
  result_code?: unknown;
};

function isPrepareRiskShareItemsUuid(value: unknown): value is string {
  return typeof value === "string" && PREPARE_RISK_SHARE_ITEMS_UUID_PATTERN.test(value);
}

type PrepareRiskShareItemsValidationResult =
  | { ok: true; results: PrepareRiskShareItemsCandidateResult[] }
  | { ok: false; structuralCode: PrepareRiskShareItemsStructuralCode }
  | { ok: false; structuralCode: null };

/** Strict, fail-closed validator for the prepare_risk_share_items_for_tenant
 * RPC's raw PostgREST response. Every row shape, enum value, and
 * candidate/decision/item linkage is checked against the RPC's actual
 * contract (supabase/migrations/20260718010000_add_risk_share_batch_preparation_rpc.sql)
 * before any of it is trusted -- an unexpected shape here means the RPC
 * contract has drifted from what this helper was built against, not
 * something worth passing through best-effort. */
function validatePrepareRiskShareItemsResponse(
  data: unknown,
  requestedCandidateIds: string[],
): PrepareRiskShareItemsValidationResult {
  if (!Array.isArray(data) || data.length === 0) {
    return { ok: false, structuralCode: null };
  }

  if (data.length === 1) {
    const onlyRow = data[0];

    if (onlyRow && typeof onlyRow === "object" && !Array.isArray(onlyRow)) {
      const row = onlyRow as PrepareRiskShareItemsRawRow;
      const resultCode = typeof row.result_code === "string" ? row.result_code : "";

      if (PREPARE_RISK_SHARE_ITEMS_STRUCTURAL_CODES.has(resultCode)) {
        if (
          row.candidate_id !== null ||
          row.decision !== null ||
          row.reason_code !== null ||
          row.item_id !== null ||
          row.decision_id !== null
        ) {
          return { ok: false, structuralCode: null };
        }

        return { ok: false, structuralCode: resultCode as PrepareRiskShareItemsStructuralCode };
      }
    }
  }

  if (data.length > PREPARE_RISK_SHARE_ITEMS_MAX_CANDIDATES) {
    return { ok: false, structuralCode: null };
  }

  const requestedIdSet = new Set(requestedCandidateIds.map((id) => id.toLowerCase()));
  const seenCandidateIds = new Set<string>();
  const results: PrepareRiskShareItemsCandidateResult[] = [];

  for (const rawRow of data) {
    if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) {
      return { ok: false, structuralCode: null };
    }

    const row = rawRow as PrepareRiskShareItemsRawRow;
    const resultCode = typeof row.result_code === "string" ? row.result_code : "";

    if (!PREPARE_RISK_SHARE_ITEMS_CANDIDATE_CODES.has(resultCode)) {
      return { ok: false, structuralCode: null };
    }

    const candidateIdRaw = row.candidate_id;

    if (!isPrepareRiskShareItemsUuid(candidateIdRaw)) {
      return { ok: false, structuralCode: null };
    }

    const candidateId = candidateIdRaw.toLowerCase();

    if (!requestedIdSet.has(candidateId) || seenCandidateIds.has(candidateId)) {
      return { ok: false, structuralCode: null };
    }

    seenCandidateIds.add(candidateId);

    const decisionRaw = row.decision;
    const reasonCodeRaw = row.reason_code;
    const itemIdRaw = row.item_id;
    const decisionIdRaw = row.decision_id;

    let decision: PrepareRiskShareItemsDecision | null = null;
    let reasonCode: PrepareRiskShareItemsReasonCode | null = null;
    let itemId: string | null = null;
    let decisionId: string | null = null;

    if (resultCode === "created" || resultCode === "replayed") {
      if (typeof decisionRaw !== "string" || !PREPARE_RISK_SHARE_ITEMS_KNOWN_DECISIONS.has(decisionRaw)) {
        return { ok: false, structuralCode: null };
      }

      if (
        typeof reasonCodeRaw !== "string" ||
        !PREPARE_RISK_SHARE_ITEMS_KNOWN_REASON_CODES.has(reasonCodeRaw)
      ) {
        return { ok: false, structuralCode: null };
      }

      if (!isPrepareRiskShareItemsUuid(decisionIdRaw)) {
        return { ok: false, structuralCode: null };
      }

      decision = decisionRaw as PrepareRiskShareItemsDecision;
      reasonCode = reasonCodeRaw as PrepareRiskShareItemsReasonCode;
      decisionId = decisionIdRaw;

      if (decision === "auto_prepared") {
        if (reasonCode !== "AUTO_SOURCE_FAITHFUL" || !isPrepareRiskShareItemsUuid(itemIdRaw)) {
          return { ok: false, structuralCode: null };
        }

        itemId = itemIdRaw;
      } else {
        if (reasonCode !== "MISSING_REQUIRED_FIELD" && reasonCode !== "MAPPING_CONFLICT") {
          return { ok: false, structuralCode: null };
        }

        if (itemIdRaw !== null) {
          return { ok: false, structuralCode: null };
        }
      }
    } else if (resultCode === "item_already_exists") {
      if (decisionRaw !== null || reasonCodeRaw !== null || decisionIdRaw !== null) {
        return { ok: false, structuralCode: null };
      }

      if (!isPrepareRiskShareItemsUuid(itemIdRaw)) {
        return { ok: false, structuralCode: null };
      }

      itemId = itemIdRaw;
    } else {
      if (
        decisionRaw !== null ||
        reasonCodeRaw !== null ||
        itemIdRaw !== null ||
        decisionIdRaw !== null
      ) {
        return { ok: false, structuralCode: null };
      }
    }

    results.push({
      candidateId,
      resultCode: resultCode as PrepareRiskShareItemsCandidateResultCode,
      decision,
      reasonCode,
      itemId,
      decisionId,
    });
  }

  if (results.length !== requestedIdSet.size) {
    return { ok: false, structuralCode: null };
  }

  return { ok: true, results };
}

/** Server-only call to the prepare_risk_share_items_for_tenant Postgres RPC
 * (added in 20260718010000, digest-schema-corrected in 20260718020000).
 * This is the only write path this helper exposes onto
 * risk_share_items/risk_share_preparation_decisions for A2 batch
 * preparation: the RPC alone validates membership, locks the source and
 * every candidate row, enforces idempotency-replay semantics, and writes
 * both the item and its decision ledger row atomically -- this helper must
 * never INSERT/UPDATE/PATCH/DELETE those tables directly. Always sends an
 * explicit p_candidate_ids array and a hardcoded p_policy_version -- never
 * the RPC's "all eligible" (null candidateIds) mode, which is out of scope
 * for this API. */
export async function prepareRiskShareItemsForTenant(
  params: PrepareRiskShareItemsParams,
): Promise<PrepareRiskShareItemsResult> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceRoleKey = getSupabaseServiceRoleKey();

  const failClosed = (
    code: Exclude<PrepareRiskShareItemsCode, "ok">,
  ): PrepareRiskShareItemsResult => ({
    ok: false,
    code,
    results: null,
  });

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return failClosed("request_failed");
  }

  if (
    params.candidateIds.length === 0 ||
    params.candidateIds.length > PREPARE_RISK_SHARE_ITEMS_MAX_CANDIDATES
  ) {
    return failClosed("request_failed");
  }

  let res: Response;

  try {
    res = await fetch(`${supabaseUrl}/rest/v1/rpc/prepare_risk_share_items_for_tenant`, {
      method: "POST",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        p_company_code: params.companyCode,
        p_source_id: params.sourceId,
        p_actor_membership_id: params.actorMembershipId,
        p_policy_version: 1,
        p_idempotency_key: params.idempotencyKey,
        p_candidate_ids: params.candidateIds,
      }),
      cache: "no-store",
    });
  } catch {
    return failClosed("request_failed");
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => undefined);
    const rawMessage =
      errorData && typeof errorData === "object" && !Array.isArray(errorData)
        && typeof (errorData as { message?: unknown }).message === "string"
        ? (errorData as { message: string }).message
        : "";
    const errorCode =
      errorData && typeof errorData === "object" && !Array.isArray(errorData)
        && typeof (errorData as { code?: unknown }).code === "string"
        ? (errorData as { code: string }).code
        : null;

    console.error("[prepare-risk-share-items-rpc] request failed", {
      status: res.status,
      statusText: res.statusText,
      errorCode,
      safeMessage: scrubSupabaseRpcErrorMessage(rawMessage) || null,
      requestedCandidateCount: params.candidateIds.length,
    });

    return failClosed("request_failed");
  }

  const data = await res.json().catch(() => undefined);
  const validated = validatePrepareRiskShareItemsResponse(data, params.candidateIds);

  if (!validated.ok) {
    if (validated.structuralCode) {
      return failClosed(validated.structuralCode);
    }

    console.error("[prepare-risk-share-items-rpc] unexpected response shape", {
      responseKind: Array.isArray(data) ? "array" : typeof data,
      rowCount: Array.isArray(data) ? data.length : undefined,
      requestedCandidateCount: params.candidateIds.length,
    });

    return failClosed("invalid_response");
  }

  return { ok: true, code: "ok", results: validated.results };
}
