"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type ShareReviewClientItem =
  | {
      kind: "valid";
      id: string;
      siteName: string | null;
      sourceTitle: string;
      taskName: string;
      hazard: string;
      riskLevel: string | null;
      currentControls: string | null;
      improvementPlan: string | null;
      workerShareSummary: string | null;
      shareStatus: string;
      workerVisible: boolean;
      isLocked: boolean;
      sourcePage: number | null;
      sourceRow: string | null;
      reviewRevision: number;
    }
  | { kind: "invalid"; id: string | null };

type ShareReviewClientProps = {
  companyCode: string;
  lang: string;
  managerHref: string;
  publishHref: string;
  listStatus: "ok" | "failed";
  items: ShareReviewClientItem[];
  overflow: boolean;
};

/** Matches the API route's minimized response exactly -- the route never
 * returns an item snapshot, review event id, or version lock id to the
 * browser. The client re-reads authoritative state via router.refresh()
 * instead of trusting a mutation response body. */
type ReviewApiResponse = {
  ok: boolean;
  code: string;
  replayed: boolean;
};

/** code -> the HTTP status(es) the route can legitimately pair it with.
 * "forbidden" is the one code with two valid statuses: the route returns
 * 401 for unauthenticated and 403 for every other forbidden reason, both
 * carrying code "forbidden". */
const ACCEPTABLE_STATUS_BY_CODE: Record<string, number[]> = {
  ok: [200],
  invalid_action: [422],
  validation_failed: [422],
  forbidden: [401, 403],
  not_found: [404],
  locked: [409],
  idempotency_conflict: [409],
  stale_revision: [409],
  request_failed: [503],
  invalid_response: [503],
};

const REVIEW_API_RESPONSE_ALLOWED_KEYS = new Set(["ok", "code", "replayed"]);

/** Strict parse of the API route's response body. Anything outside the
 * exact allowed shape -- extra/missing keys, wrong types, an unknown code,
 * ok/code disagreeing, replayed=true without ok=true+code="ok", or a code
 * paired with a status the route would never actually send for it -- is
 * treated as malformed, not as a best-effort partial success. A malformed
 * response must never be read as ok=true. */
function parseReviewApiResponse(raw: unknown, httpStatus: number): ReviewApiResponse | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  for (const key of Object.keys(raw)) {
    if (!REVIEW_API_RESPONSE_ALLOWED_KEYS.has(key)) {
      return null;
    }
  }

  const row = raw as Record<string, unknown>;

  if (
    typeof row.ok !== "boolean" ||
    typeof row.replayed !== "boolean" ||
    typeof row.code !== "string"
  ) {
    return null;
  }

  const acceptableStatuses = ACCEPTABLE_STATUS_BY_CODE[row.code];

  if (!acceptableStatuses) {
    return null;
  }

  if (row.ok !== (row.code === "ok")) {
    return null;
  }

  if (row.replayed && !(row.ok && row.code === "ok")) {
    return null;
  }

  if (!acceptableStatuses.includes(httpStatus)) {
    return null;
  }

  return { ok: row.ok, code: row.code, replayed: row.replayed };
}

type MessageTone = "success" | "info" | "warning" | "error";

type ItemMessage = { tone: MessageTone; text: string };

function getStatusBadge(item: Extract<ShareReviewClientItem, { kind: "valid" }>): {
  label: string;
  className: string;
} {
  if (item.isLocked) {
    return { label: "게시 완료 · 수정 불가", className: "b-blue" };
  }

  switch (item.shareStatus) {
    case "draft":
    case "needs_customer_check":
      return { label: "확인 필요", className: "b-orange" };
    case "customer_confirmed":
      return { label: "확인 완료", className: "b-green" };
    case "excluded":
      return { label: "공유 제외", className: "b-gray" };
    default:
      return { label: "상태 확인 필요", className: "b-gray" };
  }
}

function formatSourceLocation(sourcePage: number | null, sourceRow: string | null) {
  const parts: string[] = [];

  if (sourcePage !== null) {
    parts.push(`p.${sourcePage}`);
  }

  if (sourceRow) {
    parts.push(`${sourceRow}행`);
  }

  return parts.length > 0 ? parts.join(" · ") : "위치 정보 없음";
}

function messageStyle(tone: MessageTone): React.CSSProperties {
  switch (tone) {
    case "success":
      return { borderColor: "var(--success)", background: "var(--success-bg)", color: "var(--success)" };
    case "warning":
      return { borderColor: "var(--warning)", background: "var(--warning-bg)", color: "var(--warning)" };
    case "error":
      return { borderColor: "var(--danger)", background: "var(--danger-bg)", color: "var(--danger)" };
    default:
      return { borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text-2)" };
  }
}

type EditValues = {
  taskName: string;
  hazard: string;
  currentControls: string;
  improvementPlan: string;
  riskLevel: string;
  workerShareSummary: string;
};

function editValuesFromItem(item: Extract<ShareReviewClientItem, { kind: "valid" }>): EditValues {
  return {
    taskName: item.taskName,
    hazard: item.hazard,
    currentControls: item.currentControls ?? "",
    improvementPlan: item.improvementPlan ?? "",
    riskLevel: item.riskLevel ?? "",
    workerShareSummary: item.workerShareSummary ?? "",
  };
}

function buildPayloadSignature(
  action: "include" | "edit_include" | "exclude",
  fields: {
    taskName: string | null;
    hazard: string | null;
    currentControls: string | null;
    improvementPlan: string | null;
    riskLevel: string | null;
    workerShareSummary: string | null;
  },
  workerVisible: boolean,
) {
  return JSON.stringify({ action, ...fields, workerVisible });
}

/** The RPC's edit_include contract treats a null/blank optional field as
 * "leave the current value alone" (coalesce), not "clear it" -- there is no
 * explicit-clear contract yet (that's a separate future DB change). Blocking
 * this client-side before submit avoids a request that silently keeps the
 * old value while the UI would otherwise look like it succeeded. Only the
 * four genuinely optional fields are checked; task_name/hazard are already
 * required and enforced separately. */
const OPTIONAL_CLEARABLE_FIELDS = [
  "currentControls",
  "improvementPlan",
  "riskLevel",
  "workerShareSummary",
] as const;

function findBlockedOptionalFieldClear(
  item: Extract<ShareReviewClientItem, { kind: "valid" }>,
  editValues: EditValues,
): boolean {
  return OPTIONAL_CLEARABLE_FIELDS.some((field) => {
    const existing = item[field];
    const edited = editValues[field].trim();
    return Boolean(existing) && edited.length === 0;
  });
}

function ShareReviewItemCard({
  item,
  apiUrl,
}: {
  item: Extract<ShareReviewClientItem, { kind: "valid" }>;
  apiUrl: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [editValues, setEditValues] = useState<EditValues>(() => editValuesFromItem(item));
  const [workerVisible, setWorkerVisible] = useState(item.workerVisible);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<ItemMessage | null>(null);
  const [pendingIdempotencyKey, setPendingIdempotencyKey] = useState<string | null>(null);
  const [pendingPayloadSignature, setPendingPayloadSignature] = useState<string | null>(null);

  const badge = getStatusBadge(item);
  const locationLabel = formatSourceLocation(item.sourcePage, item.sourceRow);

  // Resync local form/pending state whenever the server-confirmed item
  // actually changes value (a real mutation -- by this RPC, by someone
  // else, or reflected after this card's own submit + router.refresh()).
  // This follows React's documented "adjust state during render" pattern
  // (comparing against a stored previous value) rather than a useEffect, so
  // there is no extra render pass and no setState-in-effect warning. The
  // signature is built only from primitives, so a parent rerender that
  // passes a new item object with byte-identical field values does not
  // reset anything -- in-progress typing survives an unrelated rerender,
  // but never survives real server-side drift. A pending idempotency key
  // always belongs to the revision it was generated against, so it is
  // discarded here rather than risking a replay against the wrong base
  // state. success/stale/etc. messages are intentionally untouched --
  // they're only ever set by submitReview itself.
  const syncSignature = JSON.stringify([
    item.id,
    item.reviewRevision,
    item.taskName,
    item.hazard,
    item.currentControls,
    item.improvementPlan,
    item.riskLevel,
    item.workerShareSummary,
    item.workerVisible,
    item.shareStatus,
    item.isLocked,
  ]);
  const [syncedSignature, setSyncedSignature] = useState(syncSignature);

  if (syncSignature !== syncedSignature) {
    setSyncedSignature(syncSignature);
    setEditValues(editValuesFromItem(item));
    setWorkerVisible(item.workerVisible);
    setMode("view");
    setPendingIdempotencyKey(null);
    setPendingPayloadSignature(null);
  }

  function resetEditingState() {
    setMode("view");
    setEditValues(editValuesFromItem(item));
    setWorkerVisible(item.workerVisible);
  }

  async function submitReview(action: "include" | "edit_include" | "exclude") {
    if (submitting) {
      return;
    }

    const fields =
      action === "edit_include"
        ? {
            taskName: editValues.taskName.trim() || null,
            hazard: editValues.hazard.trim() || null,
            currentControls: editValues.currentControls.trim() || null,
            improvementPlan: editValues.improvementPlan.trim() || null,
            riskLevel: editValues.riskLevel.trim() || null,
            workerShareSummary: editValues.workerShareSummary.trim() || null,
          }
        : {
            taskName: null,
            hazard: null,
            currentControls: null,
            improvementPlan: null,
            riskLevel: null,
            workerShareSummary: null,
          };

    if (action === "edit_include" && (!fields.taskName || !fields.hazard)) {
      setMessage({ tone: "error", text: "작업명과 위험요인은 비워둘 수 없습니다." });
      return;
    }

    if (action === "edit_include" && findBlockedOptionalFieldClear(item, editValues)) {
      setMessage({
        tone: "error",
        text: "기존에 입력된 선택 항목을 빈칸으로 삭제하는 기능은 현재 지원되지 않습니다. 내용을 수정하거나 운영 담당자에게 문의해 주세요.",
      });
      return;
    }

    // No client-side "nothing changed" short-circuit here: the client's
    // local view of item state can be stale relative to the DB (another
    // tab, another reviewer, a background refresh that hasn't landed yet).
    // Every include/edit_include reaches the RPC, which is the only thing
    // that can correctly tell a genuine no-op apart from a real change
    // against a state the client doesn't yet know about -- including via
    // stale_revision if the client's assumed base state has moved.
    const submitWorkerVisible = action === "exclude" ? false : workerVisible;
    const payloadSignature = buildPayloadSignature(action, fields, submitWorkerVisible);

    let idempotencyKey: string;

    if (pendingIdempotencyKey && pendingPayloadSignature === payloadSignature) {
      idempotencyKey = pendingIdempotencyKey;
    } else {
      idempotencyKey = crypto.randomUUID();
      setPendingIdempotencyKey(idempotencyKey);
      setPendingPayloadSignature(payloadSignature);
    }

    setSubmitting(true);
    setMessage(null);

    let response: Response;

    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          expectedRevision: item.reviewRevision,
          action,
          idempotencyKey,
          workerVisible: submitWorkerVisible,
          ...fields,
        }),
      });
    } catch {
      setSubmitting(false);
      setMessage({ tone: "error", text: "요청을 처리하지 못했습니다. 입력값은 유지됩니다. 다시 시도해 주세요." });
      return;
    }

    let rawData: unknown;

    try {
      rawData = await response.json();
    } catch {
      setSubmitting(false);
      setMessage({ tone: "error", text: "요청을 처리하지 못했습니다. 입력값은 유지됩니다. 다시 시도해 주세요." });
      return;
    }

    setSubmitting(false);

    const data = parseReviewApiResponse(rawData, response.status);

    if (!data) {
      // Malformed response: shape/type/enum/status mismatch, or an
      // internally inconsistent ok/code/replayed combination. Never read
      // this as success -- keep the same idempotency key and payload so a
      // manual retry can replay safely, exactly like an unknown network
      // failure.
      setMessage({ tone: "error", text: "요청을 처리하지 못했습니다. 입력값은 유지됩니다. 다시 시도해 주세요." });
      return;
    }

    switch (data.code) {
      case "ok": {
        setPendingIdempotencyKey(null);
        setPendingPayloadSignature(null);
        setMode("view");
        setMessage(
          data.replayed
            ? { tone: "info", text: "이미 처리된 요청을 최신 상태로 반영했습니다." }
            : { tone: "success", text: "확인 내용이 저장되었습니다." },
        );
        router.refresh();
        return;
      }
      case "stale_revision": {
        setPendingIdempotencyKey(null);
        setPendingPayloadSignature(null);
        setMode("view");
        setMessage({ tone: "warning", text: "다른 화면에서 내용이 변경되었습니다. 최신 내용을 다시 확인해 주세요." });
        router.refresh();
        return;
      }
      case "locked": {
        setPendingIdempotencyKey(null);
        setPendingPayloadSignature(null);
        setMode("view");
        setMessage({ tone: "warning", text: "이미 게시된 항목은 수정할 수 없습니다." });
        router.refresh();
        return;
      }
      case "not_found": {
        setPendingIdempotencyKey(null);
        setPendingPayloadSignature(null);
        setMessage({ tone: "error", text: "항목을 찾을 수 없거나 접근할 수 없습니다." });
        return;
      }
      case "idempotency_conflict": {
        setPendingIdempotencyKey(null);
        setPendingPayloadSignature(null);
        setMessage({
          tone: "error",
          text: "요청 상태를 확인할 수 없습니다. 화면을 새로고침한 뒤 다시 진행해 주세요.",
        });
        return;
      }
      case "validation_failed":
      case "invalid_action": {
        setPendingIdempotencyKey(null);
        setPendingPayloadSignature(null);
        setMessage({ tone: "error", text: "입력값을 다시 확인해 주세요." });
        return;
      }
      case "forbidden": {
        setPendingIdempotencyKey(null);
        setPendingPayloadSignature(null);
        setMessage({ tone: "error", text: "접근 권한이 확인되지 않았습니다. 새로고침 후 다시 시도해 주세요." });
        return;
      }
      default: {
        // request_failed / invalid_response / anything unexpected: keep the
        // pending key+payload so a manual retry replays safely instead of
        // risking a second real mutation.
        setMessage({ tone: "error", text: "요청을 처리하지 못했습니다. 입력값은 유지됩니다. 다시 시도해 주세요." });
      }
    }
  }

  function handleExcludeClick() {
    if (submitting) {
      return;
    }

    const confirmed = window.confirm("선택한 항목을 다음 공유본 대상에서 제외하시겠습니까?");

    if (!confirmed) {
      return;
    }

    void submitReview("exclude");
  }

  if (item.isLocked) {
    return (
      <article className="card card--pad" style={{ display: "grid", gap: "10px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 800 }}>{item.taskName}</h3>
          <span className={`badge ${badge.className}`}>{badge.label}</span>
        </div>
        <p className="muted" style={{ fontSize: "14px" }}>{item.hazard}</p>
        <p className="muted" style={{ fontSize: "13px" }}>
          이미 게시된 항목은 이 화면에서 더 이상 수정할 수 없습니다.
        </p>
      </article>
    );
  }

  return (
    <article className="card card--pad" style={{ display: "grid", gap: "14px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 800 }}>{mode === "view" ? item.taskName : "내용 수정"}</h3>
          <p className="muted" style={{ fontSize: "13px", marginTop: "2px" }}>
            {item.siteName ? `${item.siteName} · ` : ""}
            {item.sourceTitle} · {locationLabel}
          </p>
        </div>
        <span className={`badge ${badge.className}`}>{badge.label}</span>
      </div>

      {message ? (
        <div className="notice" style={{ ...messageStyle(message.tone), fontSize: "13px" }} role="status">
          {message.text}
        </div>
      ) : null}

      {mode === "view" ? (
        <div style={{ display: "grid", gap: "10px" }}>
          <div>
            <p className="muted" style={{ fontSize: "12px", fontWeight: 800 }}>위험요인</p>
            <p style={{ fontSize: "14px", lineHeight: 1.6, overflowWrap: "anywhere" }}>{item.hazard}</p>
          </div>
          {item.currentControls ? (
            <div>
              <p className="muted" style={{ fontSize: "12px", fontWeight: 800 }}>현재 관리대책</p>
              <p style={{ fontSize: "14px", lineHeight: 1.6, overflowWrap: "anywhere" }}>{item.currentControls}</p>
            </div>
          ) : null}
          {item.improvementPlan ? (
            <div>
              <p className="muted" style={{ fontSize: "12px", fontWeight: 800 }}>개선대책</p>
              <p style={{ fontSize: "14px", lineHeight: 1.6, overflowWrap: "anywhere" }}>{item.improvementPlan}</p>
            </div>
          ) : null}
          {item.workerShareSummary ? (
            <div>
              <p className="muted" style={{ fontSize: "12px", fontWeight: 800 }}>근로자 공유 문구</p>
              <p style={{ fontSize: "14px", lineHeight: 1.6, overflowWrap: "anywhere" }}>{item.workerShareSummary}</p>
            </div>
          ) : null}
          {item.riskLevel ? (
            <div>
              <p className="muted" style={{ fontSize: "12px", fontWeight: 800 }}>위험등급</p>
              <p style={{ fontSize: "14px" }}>{item.riskLevel}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          <label className="form-field">
            <span>작업명</span>
            <input
              value={editValues.taskName}
              maxLength={200}
              disabled={submitting}
              onChange={(event) => setEditValues((prev) => ({ ...prev, taskName: event.target.value }))}
            />
          </label>
          <label className="form-field">
            <span>위험요인</span>
            <textarea
              value={editValues.hazard}
              maxLength={500}
              rows={3}
              disabled={submitting}
              onChange={(event) => setEditValues((prev) => ({ ...prev, hazard: event.target.value }))}
            />
          </label>
          <label className="form-field">
            <span>현재 관리대책</span>
            <textarea
              value={editValues.currentControls}
              maxLength={800}
              rows={3}
              disabled={submitting}
              onChange={(event) => setEditValues((prev) => ({ ...prev, currentControls: event.target.value }))}
            />
          </label>
          <label className="form-field">
            <span>개선대책</span>
            <textarea
              value={editValues.improvementPlan}
              maxLength={800}
              rows={3}
              disabled={submitting}
              onChange={(event) => setEditValues((prev) => ({ ...prev, improvementPlan: event.target.value }))}
            />
          </label>
          <label className="form-field">
            <span>근로자 공유 문구</span>
            <textarea
              value={editValues.workerShareSummary}
              maxLength={800}
              rows={2}
              disabled={submitting}
              onChange={(event) => setEditValues((prev) => ({ ...prev, workerShareSummary: event.target.value }))}
            />
          </label>
          <label className="form-field">
            <span>위험등급</span>
            <input
              value={editValues.riskLevel}
              maxLength={40}
              disabled={submitting}
              onChange={(event) => setEditValues((prev) => ({ ...prev, riskLevel: event.target.value }))}
            />
          </label>
          <p className="muted" style={{ fontSize: "12px" }}>
            기존 문구를 완전히 삭제하는 기능은 아직 지원되지 않습니다.
          </p>
        </div>
      )}

      <label
        className="form-field"
        style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px", fontWeight: 700 }}
      >
        <input
          type="checkbox"
          checked={workerVisible}
          disabled={submitting}
          onChange={(event) => setWorkerVisible(event.target.checked)}
        />
        <span>다음 현장 공유본에 포함</span>
      </label>
      <p className="muted" style={{ fontSize: "12px", marginTop: "-6px" }}>
        이 설정만으로 현장에 즉시 공개되지는 않습니다. 공유본 게시가 완료된 뒤 반영됩니다.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {mode === "view" ? (
          <>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={submitting}
              onClick={() => void submitReview("include")}
            >
              {submitting ? "처리 중" : item.shareStatus === "excluded" ? "제외된 항목 다시 포함" : "내용 그대로 포함"}
            </button>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              disabled={submitting}
              onClick={() => setMode("edit")}
            >
              수정 후 포함
            </button>
            {item.shareStatus !== "excluded" ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={submitting}
                onClick={handleExcludeClick}
              >
                공유 제외
              </button>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={submitting}
              onClick={() => void submitReview("edit_include")}
            >
              {submitting ? "저장 중" : "수정 내용 저장"}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={submitting}
              onClick={resetEditingState}
            >
              취소
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export default function ShareReviewClient({
  companyCode,
  managerHref,
  listStatus,
  items,
  overflow,
}: ShareReviewClientProps) {
  const apiUrl = useMemo(
    () => `/api/risk-share/manager/share-review?company=${encodeURIComponent(companyCode)}`,
    [companyCode],
  );

  const validCount = items.filter((entry) => entry.kind === "valid").length;
  const invalidCount = items.filter((entry) => entry.kind === "invalid").length;
  const validItems = items.filter(
    (entry): entry is Extract<ShareReviewClientItem, { kind: "valid" }> => entry.kind === "valid",
  );
  const statusCounts = {
    needsReview: validItems.filter(
      (entry) => !entry.isLocked && ["draft", "needs_customer_check"].includes(entry.shareStatus),
    ).length,
    confirmed: validItems.filter(
      (entry) => !entry.isLocked && entry.shareStatus === "customer_confirmed",
    ).length,
    excluded: validItems.filter(
      (entry) => !entry.isLocked && entry.shareStatus === "excluded",
    ).length,
    published: validItems.filter((entry) => entry.isLocked).length,
  };

  return (
    <div className="content" style={{ padding: "24px", overflowX: "hidden" }}>
      <div className="page-head" style={{ maxWidth: "860px" }}>
        <div>
          <p className="eyebrow">SafeMetrica · 안전운영</p>
          <h1>공유할 위험성평가</h1>
          <p>근로자에게 알릴 위험요인과 안전조치를 확인하고 공유를 준비합니다.</p>
          <p className="notice" style={{ marginTop: "12px", maxWidth: "640px" }}>
            이 화면에서 확인한 내용은 공유본 게시 전까지 현장 QR에 공개되지 않습니다.
          </p>
        </div>
        <div className="page-head__actions">
          <a className="btn btn--ghost" href={managerHref}>
            관리자 홈으로
          </a>
        </div>
      </div>

      <div style={{ maxWidth: "860px", marginTop: "18px", display: "grid", gap: "14px" }}>
        <section className="card card--pad" aria-label="위험성평가 공유 단계">
          <p className="eyebrow">공유 단계</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <div><b>1. 내용 검토</b><p className="muted" style={{ marginTop: "4px", fontSize: "13px" }}>위험요인과 안전조치를 확인합니다.</p></div>
            <div><b>2. 게시 항목 선택</b><p className="muted" style={{ marginTop: "4px", fontSize: "13px" }}>공유할 항목을 직접 선택합니다.</p></div>
            <div><b>3. 현장 QR 공유</b><p className="muted" style={{ marginTop: "4px", fontSize: "13px" }}>게시 시점의 내용이 고정됩니다.</p></div>
          </div>
        </section>

        <section
          aria-label="공유 준비 현황"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}
        >
          {[
            ["확인 필요", statusCounts.needsReview, "b-orange"],
            ["확인 완료", statusCounts.confirmed, "b-green"],
            ["공유 제외", statusCounts.excluded, "b-gray"],
            ["게시 완료", statusCounts.published, "b-blue"],
          ].map(([label, count, badgeClass]) => (
            <article className="card card--pad" key={String(label)}>
              <span className={`badge ${badgeClass}`}>{label}</span>
              <p style={{ marginTop: "10px", fontSize: "24px", fontWeight: 900 }}>{count}건</p>
            </article>
          ))}
        </section>

        <section
          className="card card--pad"
          style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}
        >
          <div>
            <p style={{ fontWeight: 900 }}>내용 검토가 끝났다면 게시할 항목을 선택하세요.</p>
            <p className="muted" style={{ marginTop: "4px", fontSize: "13px" }}>
              다음 화면에서도 항목을 자동 선택하지 않으며, 관리자가 직접 확인합니다.
            </p>
          </div>
          <a className="btn btn--primary" href={props.publishHref}>게시할 항목 선택</a>
        </section>

        {listStatus === "failed" ? (
          <div className="notice" style={{ ...messageStyle("error") }}>
            공유 항목을 불러오지 못했습니다.
            <br />
            잠시 후 다시 시도해 주세요.
          </div>
        ) : overflow ? (
          <div className="notice" style={{ ...messageStyle("warning") }}>
            확인할 항목이 많아 전체 목록을 안전하게 표시하지 못했습니다.
            <br />
            운영 담당자에게 확인해 주세요.
          </div>
        ) : null}

        {listStatus === "ok" && !overflow && validCount === 0 && invalidCount === 0 ? (
          <div className="card card--pad">
            <p style={{ fontWeight: 800 }}>현재 확인할 공유 항목이 없습니다.</p>
            <p className="muted" style={{ marginTop: "6px", fontSize: "14px" }}>
              원본 등록·열 매핑·항목 준비 상태를 확인해 주세요.
            </p>
          </div>
        ) : null}

        {/* overflow fail-closed: the 200 rows we do have are not shown as a
            complete, reviewable list -- the customer would otherwise see a
            partial list with no indication anything is missing, and could
            act on it as if it were the whole picture. No item cards, no
            include/edit/exclude actions, until the row count is back under
            the display cap. */}
        {listStatus === "ok" && !overflow
          ? items.map((entry, index) =>
              entry.kind === "valid" ? (
                <ShareReviewItemCard key={entry.id} item={entry} apiUrl={apiUrl} />
              ) : (
                <article
                  key={entry.id ?? `invalid-${index}`}
                  className="card card--pad"
                  style={{ borderColor: "var(--warning)" }}
                >
                  <p style={{ fontWeight: 800, color: "var(--warning)" }}>
                    해당 항목의 데이터 상태를 확인해야 합니다.
                  </p>
                </article>
              ),
            )
          : null}
      </div>
    </div>
  );
}
