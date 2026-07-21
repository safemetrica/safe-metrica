import "server-only";

import { selectSupabaseExportRows } from "@/lib/supabaseServer";

export type ManagerInboxType = "monthly" | "prework" | "anonymous" | "visitor" | "representative";
export type ManagerInboxStatus = "unreviewed" | "in_review" | "completed";

export type ManagerInboxItem = {
  id: string;
  type: ManagerInboxType;
  title: string;
  content: string;
  location: string;
  submitterLabel: string;
  createdAt: string;
  status: ManagerInboxStatus;
  actionNote: string;
  canTransition: boolean;
};

type DbRow = {
  id?: unknown; title?: unknown; content?: unknown; location?: unknown; submitter?: unknown;
  anonymous?: unknown; created_at?: unknown; manager_review_status?: unknown;
  manager_action_note?: unknown; version_lock_id?: unknown; source?: unknown; mode?: unknown;
};

const SOURCE_TYPES: Record<string, ManagerInboxType | undefined> = {
  "risk_share_participation_submit_v1:monthly": "monthly",
  "risk_share_participation_submit_v1:prework": "prework",
  risk_share_anonymous_feedback_v1: "anonymous",
  anonymous_worker_feedback_v1: "anonymous",
  risk_share_visitor_confirmation_v1: "visitor",
  risk_share_representative_confirmation_v1: "representative",
};
const STATUSES = new Set<ManagerInboxStatus>(["unreviewed", "in_review", "completed"]);

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

function resolveType(sourceValue: unknown, modeValue: unknown): ManagerInboxType | null {
  const source = text(sourceValue);
  const mode = text(modeValue);
  return SOURCE_TYPES[mode ? `${source}:${mode}` : source] ?? null;
}

export async function listManagerInboxItems(companyCode: string): Promise<ManagerInboxItem[]> {
  const query = new URLSearchParams({
    select: "id,title,content,location,submitter,anonymous,created_at,manager_review_status,manager_action_note,version_lock_id,source:raw_payload->>source,mode:raw_payload->>mode",
    tenant_code: `eq.${companyCode}`,
    order: "created_at.desc,id.desc",
    limit: "200",
  });
  const rows = await selectSupabaseExportRows<DbRow>("field_participation_submissions", query);
  return rows.flatMap((row): ManagerInboxItem[] => {
    const id = text(row.id);
    const type = resolveType(row.source, row.mode);
    if (!id || !type) return [];
    const status = STATUSES.has(row.manager_review_status as ManagerInboxStatus)
      ? row.manager_review_status as ManagerInboxStatus : "unreviewed";
    const isAnonymous = type === "anonymous" || row.anonymous === true;
    return [{
      id,
      type,
      title: text(row.title) || "접수 내용",
      content: text(row.content),
      location: text(row.location),
      submitterLabel: isAnonymous ? "익명" : text(row.submitter) || "미입력",
      createdAt: text(row.created_at),
      status,
      actionNote: text(row.manager_action_note),
      canTransition: type === "monthly" && Boolean(text(row.version_lock_id)),
    }];
  });
}
