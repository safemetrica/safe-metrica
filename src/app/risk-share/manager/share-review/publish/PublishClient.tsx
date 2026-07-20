"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type PublishClientEntryState =
  | "ready_to_publish"
  | "already_locked"
  | "review_required";

export type PublishClientReviewReason =
  | "excluded"
  | "share_status_not_customer_confirmed"
  | "customer_check_not_confirmed"
  | "customer_confirmation_missing";

export type PublishClientEntry =
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
      workerVisible: boolean;
      /** Canonical PostgreSQL bigint decimal text; never convert to number. */
      reviewRevision: string;
      state: PublishClientEntryState;
      reviewReasons: PublishClientReviewReason[];
    }
  | {
      kind: "invalid";
      id: string | null;
    };

export type PublishClientActiveVersion = {
  lockTitle: string;
  lockMonth: string;
  itemCount: number;
  workerVisibleCount: number;
  createdAt: string;
};

type PublishClientCounts = {
  readyToPublish: number;
  alreadyLocked: number;
  reviewRequired: number;
  invalid: number;
};

type PublishClientProps = {
  companyCode: string;
  lockMonth: string;
  defaultLockTitle: string;
  managerHref: string;
  reviewHref: string;
  readStatus: "ok" | "failed";
  entries: PublishClientEntry[];
  activeVersion: PublishClientActiveVersion | null;
  overflow: boolean;
  counts: PublishClientCounts;
};

type PublishApiCode =
  | "ok"
  | "validation_failed"
  | "forbidden"
  | "selection_mismatch"
  | "active_month_exists"
  | "idempotency_conflict"
  | "request_failed"
  | "invalid_response";

type PublishApiResponse =
  | {
      ok: true;
      code: "ok";
      replayed: boolean;
      itemCount: number;
      workerVisibleCount: number;
    }
  | {
      ok: false;
      code: Exclude<PublishApiCode, "ok">;
      replayed: false;
    };

type MessageTone = "success" | "info" | "warning" | "error";
type PageMessage = { tone: MessageTone; text: string };

const SUCCESS_RESPONSE_KEYS = new Set([
  "ok",
  "code",
  "replayed",
  "itemCount",
  "workerVisibleCount",
]);
const FAILURE_RESPONSE_KEYS = new Set(["ok", "code", "replayed"]);
const FAILURE_STATUS_BY_CODE: Record<Exclude<PublishApiCode, "ok">, number[]> = {
  validation_failed: [422],
  forbidden: [401, 403],
  selection_mismatch: [409],
  active_month_exists: [409],
  idempotency_conflict: [409],
  request_failed: [503],
  invalid_response: [503],
};

const REVIEW_REASON_LABELS: Record<PublishClientReviewReason, string> = {
  excluded: "공유 제외 상태",
  share_status_not_customer_confirmed: "고객 확인 상태 미완료",
  customer_check_not_confirmed: "확인 요청 처리 미완료",
  customer_confirmation_missing: "고객 확인 기록 없음",
};

function hasExactKeys(raw: Record<string, unknown>, allowedKeys: Set<string>) {
  const keys = Object.keys(raw);
  return keys.length === allowedKeys.size && keys.every((key) => allowedKeys.has(key));
}

function parsePublishApiResponse(
  raw: unknown,
  httpStatus: number,
  expectedItemCount: number,
  expectedWorkerVisibleCount: number,
): PublishApiResponse | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const row = raw as Record<string, unknown>;

  if (row.ok === true) {
    if (
      !hasExactKeys(row, SUCCESS_RESPONSE_KEYS) ||
      row.code !== "ok" ||
      typeof row.replayed !== "boolean" ||
      httpStatus !== 200 ||
      typeof row.itemCount !== "number" ||
      !Number.isInteger(row.itemCount) ||
      row.itemCount !== expectedItemCount ||
      typeof row.workerVisibleCount !== "number" ||
      !Number.isInteger(row.workerVisibleCount) ||
      row.workerVisibleCount !== expectedWorkerVisibleCount
    ) {
      return null;
    }

    return {
      ok: true,
      code: "ok",
      replayed: row.replayed,
      itemCount: row.itemCount,
      workerVisibleCount: row.workerVisibleCount,
    };
  }

  if (
    row.ok !== false ||
    !hasExactKeys(row, FAILURE_RESPONSE_KEYS) ||
    row.replayed !== false ||
    typeof row.code !== "string"
  ) {
    return null;
  }

  const code = row.code as Exclude<PublishApiCode, "ok">;
  const allowedStatuses = FAILURE_STATUS_BY_CODE[code];

  if (!allowedStatuses || !allowedStatuses.includes(httpStatus)) {
    return null;
  }

  return { ok: false, code, replayed: false };
}

function messageStyle(tone: MessageTone): React.CSSProperties {
  switch (tone) {
    case "success":
      return {
        borderColor: "var(--success)",
        background: "var(--success-bg)",
        color: "var(--success)",
      };
    case "warning":
      return {
        borderColor: "var(--warning)",
        background: "var(--warning-bg)",
        color: "var(--warning)",
      };
    case "error":
      return {
        borderColor: "var(--danger)",
        background: "var(--danger-bg)",
        color: "var(--danger)",
      };
    default:
      return {
        borderColor: "var(--border)",
        background: "var(--surface-2)",
        color: "var(--text-2)",
      };
  }
}

function stateBadge(entry: Extract<PublishClientEntry, { kind: "valid" }>) {
  switch (entry.state) {
    case "ready_to_publish":
      return { label: "게시 가능", className: "b-green" };
    case "already_locked":
      return { label: "게시 완료", className: "b-blue" };
    default:
      return { label: "검토 필요", className: "b-orange" };
  }
}

function formatPublishedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "게시시각 확인 필요";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card card--pad" style={{ minWidth: 0 }}>
      <p className="muted" style={{ fontSize: "12px", fontWeight: 800 }}>
        {label}
      </p>
      <p style={{ marginTop: "6px", fontSize: "24px", fontWeight: 900 }}>{value}</p>
    </div>
  );
}

export default function PublishClient({
  companyCode,
  lockMonth,
  defaultLockTitle,
  managerHref,
  reviewHref,
  readStatus,
  entries,
  activeVersion,
  overflow,
  counts,
}: PublishClientProps) {
  const router = useRouter();
  const apiUrl = useMemo(
    () => `/api/risk-share/manager/publish?company=${encodeURIComponent(companyCode)}`,
    [companyCode],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lockTitle, setLockTitle] = useState(defaultLockTitle);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [pendingIdempotencyKey, setPendingIdempotencyKey] = useState<string | null>(null);
  const [pendingPayloadSignature, setPendingPayloadSignature] = useState<string | null>(null);

  const readyEntries = useMemo(
    () =>
      entries.filter(
        (entry): entry is Extract<PublishClientEntry, { kind: "valid" }> =>
          entry.kind === "valid" && entry.state === "ready_to_publish",
      ),
    [entries],
  );
  const readyById = useMemo(
    () => new Map(readyEntries.map((entry) => [entry.id, entry])),
    [readyEntries],
  );
  const selectedSorted = useMemo(() => [...selectedIds].sort(), [selectedIds]);
  const selectedEntries = useMemo(
    () => selectedSorted.map((itemId) => readyById.get(itemId) ?? null),
    [readyById, selectedSorted],
  );
  const selectedExpectedReviewRevisions = selectedEntries.map(
    (entry) => entry?.reviewRevision ?? "",
  );
  const selectedPairsAreValid =
    selectedEntries.every(
      (entry) =>
        entry !== null && /^[1-9][0-9]*$/.test(entry.reviewRevision),
    ) &&
    selectedExpectedReviewRevisions.length === selectedSorted.length;
  const selectedWorkerVisibleCount = selectedEntries.reduce(
    (count, entry) => count + (entry?.workerVisible ? 1 : 0),
    0,
  );

  const serverSignature = JSON.stringify([
    lockMonth,
    activeVersion,
    overflow,
    readStatus,
    entries.map((entry) =>
      entry.kind === "valid"
        ? [entry.id, entry.reviewRevision, entry.state, entry.workerVisible, entry.reviewReasons]
        : [entry.id, "invalid"],
    ),
  ]);
  const [syncedServerSignature, setSyncedServerSignature] = useState(serverSignature);

  if (serverSignature !== syncedServerSignature) {
    setSyncedServerSignature(serverSignature);
    setSelectedIds([]);
    setLockTitle(defaultLockTitle);
    setNotes("");
    setPendingIdempotencyKey(null);
    setPendingPayloadSignature(null);
  }

  const blocked = readStatus !== "ok" || overflow || activeVersion !== null;
  const canSubmit =
    !blocked &&
    !submitting &&
    selectedSorted.length > 0 &&
    selectedPairsAreValid &&
    lockTitle.trim().length > 0;

  function toggleSelection(itemId: string, checked: boolean) {
    if (submitting || !readyById.has(itemId)) {
      return;
    }

    setMessage(null);
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(itemId) ? current : [...current, itemId];
      }

      return current.filter((id) => id !== itemId);
    });
  }

  async function submitPublish() {
    if (!canSubmit) {
      return;
    }

    const normalizedTitle = lockTitle.trim();
    const normalizedNotes = notes.trim() || null;
    const payloadSignature = JSON.stringify({
      lockMonth,
      lockTitle: normalizedTitle,
      notes: normalizedNotes,
      itemIds: selectedSorted,
      expectedReviewRevisions: selectedExpectedReviewRevisions,
    });
    const confirmed = window.confirm(
      `${lockMonth} 공유본으로 ${selectedSorted.length}건을 게시합니다. 게시 후 선택 항목은 잠기며, 근로자별 확인 기록은 별도 단계에서 수집됩니다. 계속하시겠습니까?`,
    );

    if (!confirmed) {
      return;
    }

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
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lockMonth,
          lockTitle: normalizedTitle,
          notes: normalizedNotes,
          itemIds: selectedSorted,
          expectedReviewRevisions: selectedExpectedReviewRevisions,
          idempotencyKey,
        }),
      });
    } catch {
      setSubmitting(false);
      setMessage({
        tone: "error",
        text: "처리 결과를 확인하지 못했습니다. 같은 선택과 내용은 동일 요청으로 다시 시도할 수 있습니다.",
      });
      router.refresh();
      return;
    }

    let rawData: unknown;

    try {
      rawData = await response.json();
    } catch {
      setSubmitting(false);
      setMessage({
        tone: "error",
        text: "처리 결과를 확인하지 못했습니다. 같은 선택과 내용은 동일 요청으로 다시 시도할 수 있습니다.",
      });
      router.refresh();
      return;
    }

    setSubmitting(false);

    const data = parsePublishApiResponse(
      rawData,
      response.status,
      selectedSorted.length,
      selectedWorkerVisibleCount,
    );

    if (!data) {
      setMessage({
        tone: "error",
        text: "처리 결과를 확인하지 못했습니다. 화면 상태를 확인한 뒤 같은 선택으로 다시 시도해 주세요.",
      });
      router.refresh();
      return;
    }

    if (data.ok) {
      setPendingIdempotencyKey(null);
      setPendingPayloadSignature(null);
      setSelectedIds([]);
      setMessage(
        data.replayed
          ? { tone: "info", text: "이미 처리된 게시 요청을 최신 상태로 반영했습니다." }
          : { tone: "success", text: "공유본 게시 요청이 완료됐습니다. 최신 게시 상태를 확인합니다." },
      );
      router.refresh();
      return;
    }

    switch (data.code) {
      case "selection_mismatch":
        setPendingIdempotencyKey(null);
        setPendingPayloadSignature(null);
        setMessage({
          tone: "warning",
          text: "선택한 항목의 상태가 변경됐습니다. 최신 내용을 확인한 뒤 다시 선택해 주세요.",
        });
        router.refresh();
        return;
      case "active_month_exists":
        setPendingIdempotencyKey(null);
        setPendingPayloadSignature(null);
        setMessage({
          tone: "warning",
          text: "이 달의 공유본이 이미 게시돼 있습니다. 최신 게시 상태를 확인해 주세요.",
        });
        router.refresh();
        return;
      case "idempotency_conflict":
        setPendingIdempotencyKey(null);
        setPendingPayloadSignature(null);
        setMessage({
          tone: "error",
          text: "이전 게시 요청과 내용이 달라 처리할 수 없습니다. 화면을 새로고침한 뒤 다시 진행해 주세요.",
        });
        router.refresh();
        return;
      case "validation_failed":
        setPendingIdempotencyKey(null);
        setPendingPayloadSignature(null);
        setMessage({ tone: "error", text: "게시 월·제목·선택 항목을 다시 확인해 주세요." });
        return;
      case "forbidden":
        setPendingIdempotencyKey(null);
        setPendingPayloadSignature(null);
        setMessage({
          tone: "error",
          text: "이 작업을 수행할 관리자 권한이 확인되지 않았습니다.",
        });
        return;
      case "request_failed":
      case "invalid_response":
        setMessage({
          tone: "error",
          text: "처리 결과를 확인하지 못했습니다. 화면 상태를 확인한 뒤 같은 선택으로 다시 시도해 주세요.",
        });
        router.refresh();
        return;
    }
  }

  return (
    <div className="content" style={{ padding: "24px", overflowX: "hidden" }}>
      <div className="page-head" style={{ maxWidth: "980px" }}>
        <div>
          <p className="eyebrow">SafeMetrica · 안전운영</p>
          <h1>근로자 공유본 게시</h1>
          <p>검토가 끝난 항목을 명시적으로 선택해 현재 월 공유본으로 게시합니다.</p>
          <p className="notice" style={{ marginTop: "12px", maxWidth: "700px" }}>
            게시와 근로자별 확인 기록은 별도 단계입니다. 게시 후에는 선택 항목을 이 화면에서 수정할 수 없습니다.
          </p>
        </div>
        <div className="page-head__actions">
          <a className="btn btn--outline" href={reviewHref}>
            내용 확인으로
          </a>
          <a className="btn btn--ghost" href={managerHref}>
            관리자 홈으로
          </a>
        </div>
      </div>

      <div style={{ maxWidth: "980px", marginTop: "18px", display: "grid", gap: "16px" }}>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "10px",
          }}
          aria-label="게시 준비 상태 요약"
        >
          <SummaryCard label="게시 가능" value={counts.readyToPublish} />
          <SummaryCard label="게시 완료" value={counts.alreadyLocked} />
          <SummaryCard label="검토 필요" value={counts.reviewRequired} />
          <SummaryCard label="상태 확인 필요" value={counts.invalid} />
        </section>

        {readStatus === "failed" ? (
          <div className="notice" style={{ ...messageStyle("error") }}>
            게시 준비 상태를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.
          </div>
        ) : null}

        {overflow ? (
          <div className="notice" style={{ ...messageStyle("warning") }}>
            전체 항목을 안전하게 표시할 수 없어 게시를 중단했습니다. 운영 담당자에게 확인해 주세요.
          </div>
        ) : null}

        {activeVersion ? (
          <section className="card card--pad" style={{ borderColor: "var(--success)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "space-between" }}>
              <div>
                <p className="eyebrow">현재 월 게시본</p>
                <h2 style={{ marginTop: "4px", fontSize: "20px" }}>{activeVersion.lockTitle}</h2>
                <p className="muted" style={{ marginTop: "6px", fontSize: "13px" }}>
                  {activeVersion.lockMonth} · {formatPublishedAt(activeVersion.createdAt)}
                </p>
              </div>
              <span className="badge b-green">게시 완료</span>
            </div>
            <p style={{ marginTop: "12px", fontWeight: 800 }}>
              전체 {activeVersion.itemCount}건 · 현장 공유 {activeVersion.workerVisibleCount}건
            </p>
            <p className="muted" style={{ marginTop: "6px", fontSize: "13px" }}>
              같은 달의 새 공유본은 이 화면에서 추가 게시할 수 없습니다.
            </p>
          </section>
        ) : null}

        <section className="card card--pad" style={{ display: "grid", gap: "14px" }}>
          <div>
            <p className="eyebrow">게시 정보</p>
            <h2 style={{ marginTop: "4px", fontSize: "20px" }}>현재 월 공유본</h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <label className="form-field">
              <span>게시 월</span>
              <input value={lockMonth} readOnly disabled />
            </label>
            <label className="form-field">
              <span>공유본 제목</span>
              <input
                value={lockTitle}
                maxLength={160}
                disabled={blocked || submitting}
                onChange={(event) => setLockTitle(event.target.value)}
              />
            </label>
          </div>
          <label className="form-field">
            <span>관리 메모 · 선택사항</span>
            <textarea
              value={notes}
              rows={3}
              maxLength={500}
              disabled={blocked || submitting}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </section>

        {message ? (
          <div className="notice" style={{ ...messageStyle(message.tone) }} role="status">
            {message.text}
          </div>
        ) : null}

        <section style={{ display: "grid", gap: "12px" }} aria-label="공유본 항목 선택">
          {readStatus === "ok" && !overflow && entries.length === 0 ? (
            <div className="card card--pad">
              <p style={{ fontWeight: 800 }}>현재 표시할 공유 항목이 없습니다.</p>
              <p className="muted" style={{ marginTop: "6px", fontSize: "14px" }}>
                공유할 내용 확인 화면에서 항목 준비 상태를 확인해 주세요.
              </p>
            </div>
          ) : null}

          {readStatus === "ok" && !overflow
            ? entries.map((entry, index) => {
                if (entry.kind === "invalid") {
                  return (
                    <article
                      key={entry.id ?? `invalid-${index}`}
                      className="card card--pad"
                      style={{ borderColor: "var(--warning)" }}
                    >
                      <p style={{ fontWeight: 800, color: "var(--warning)" }}>
                        해당 항목의 데이터 상태를 확인해야 합니다.
                      </p>
                    </article>
                  );
                }

                const badge = stateBadge(entry);
                const selectable = entry.state === "ready_to_publish" && !blocked;

                return (
                  <article className="card card--pad" key={entry.id} style={{ display: "grid", gap: "10px" }}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 900 }}>{entry.taskName}</h3>
                        <p className="muted" style={{ marginTop: "3px", fontSize: "13px" }}>
                          {entry.siteName ? `${entry.siteName} · ` : ""}
                          {entry.sourceTitle}
                        </p>
                      </div>
                      <span className={`badge ${badge.className}`}>{badge.label}</span>
                    </div>

                    <div>
                      <p className="muted" style={{ fontSize: "12px", fontWeight: 800 }}>
                        위험요인
                      </p>
                      <p style={{ fontSize: "14px", lineHeight: 1.6, overflowWrap: "anywhere" }}>
                        {entry.hazard}
                      </p>
                    </div>

                    {entry.workerShareSummary ? (
                      <div>
                        <p className="muted" style={{ fontSize: "12px", fontWeight: 800 }}>
                          근로자 공유 문구
                        </p>
                        <p style={{ fontSize: "14px", lineHeight: 1.6, overflowWrap: "anywhere" }}>
                          {entry.workerShareSummary}
                        </p>
                      </div>
                    ) : null}

                    {entry.reviewReasons.length > 0 ? (
                      <p className="muted" style={{ fontSize: "13px" }}>
                        {entry.reviewReasons.map((reason) => REVIEW_REASON_LABELS[reason]).join(" · ")}
                      </p>
                    ) : null}

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      <span className="muted" style={{ fontSize: "12px" }}>
                        {entry.workerVisible ? "현장 공유 포함" : "내부 기록만 유지"}
                      </span>
                      {entry.state === "ready_to_publish" ? (
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            fontWeight: 800,
                            cursor: selectable ? "pointer" : "not-allowed",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(entry.id)}
                            disabled={!selectable || submitting}
                            onChange={(event) => toggleSelection(entry.id, event.target.checked)}
                          />
                          게시 항목 선택
                        </label>
                      ) : null}
                    </div>
                  </article>
                );
              })
            : null}
        </section>

        <section className="card card--pad" style={{ display: "grid", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <p style={{ fontWeight: 900 }}>선택 {selectedSorted.length}건</p>
              <p className="muted" style={{ marginTop: "4px", fontSize: "13px" }}>
                이 중 현장 공유 포함 {selectedWorkerVisibleCount}건
              </p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canSubmit}
              onClick={() => void submitPublish()}
            >
              {submitting ? "게시 처리 중" : "선택 항목 공유본 게시"}
            </button>
          </div>
          <p className="muted" style={{ fontSize: "12px" }}>
            항목은 자동 선택되지 않습니다. 게시할 내용을 직접 확인하고 선택해 주세요.
          </p>
        </section>
      </div>
    </div>
  );
}
