"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/** Structurally mirrors RiskSharePreparationEntry from
 * riskSharePreparationReadModel.ts, minus the redundant per-row sourceId --
 * defined locally (not imported) so this client component never imports
 * anything from that server-only module, matching the existing
 * ShareReviewClient / ShareReviewClientItem convention in this codebase. */
export type PreparationClientEntry =
  | {
      kind: "valid";
      candidateId: string;
      taskName: string;
      hazard: string;
      reviewerStatus: string;
      category: "awaiting_preparation_request" | "recorded_exception" | "already_prepared" | "not_applicable";
      hasItem: boolean;
      latestDecision: "auto_prepared" | "manager_review_required" | "owner_exception_required" | null;
      latestReasonCode: string | null;
      mappingMismatch: boolean;
      missingRequiredField: boolean;
    }
  | { kind: "invalid"; candidateId: string | null };

type PreparationSummary = {
  loadedTotal: number;
  isComplete: boolean;
  awaitingPreparationRequest: number;
  recordedException: number;
  alreadyPrepared: number;
  notApplicable: number;
  invalid: number;
};

type PreparationClientProps = {
  companyCode: string;
  sourceId: string;
  lang: string;
  companyLabel: string;
  sourcesHref: string;
  listStatus: "ok" | "empty" | "failed";
  sourceTitle: string | null;
  siteName: string | null;
  entries: PreparationClientEntry[];
  summary: PreparationSummary | null;
  overflow: boolean;
};

const MAX_CANDIDATE_IDS = 200;
const CANDIDATE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const KNOWN_RESULT_CODES = new Set([
  "created",
  "replayed",
  "item_already_exists",
  "idempotency_conflict",
  "not_eligible",
  "invalid_candidate",
]);

const KNOWN_MUTATION_DECISIONS = new Set(["auto_prepared", "owner_exception_required"]);

/** Matches the mutation API's own PrepareRiskShareItemsReasonCode type
 * exactly (src/lib/supabaseServer.ts) -- the A2 v1 RPC contract never emits
 * any of the Read Model ledger's other reason codes (FIRST_TEMPLATE_REVIEW,
 * SENSITIVE_DATA_SUSPECTED, etc.) through this API, so this pairing is
 * intentionally narrower than the Read Model's own VALID_REASON_CODES_BY_
 * DECISION. */
const REASON_CODES_BY_MUTATION_DECISION: Record<string, ReadonlySet<string>> = {
  auto_prepared: new Set(["AUTO_SOURCE_FAITHFUL"]),
  owner_exception_required: new Set(["MISSING_REQUIRED_FIELD", "MAPPING_CONFLICT"]),
};

/** code -> the HTTP status(es) the route can legitimately pair it with,
 * matching the exact same discipline as ShareReviewClient's
 * ACCEPTABLE_STATUS_BY_CODE. */
const ACCEPTABLE_STATUS_BY_CODE: Record<string, number[]> = {
  ok: [200],
  forbidden: [401, 403],
  not_found: [404],
  validation_failed: [422],
  too_many_candidates: [422],
  request_failed: [503],
  invalid_response: [503],
};

/** Structural codes that mean "nothing was applied, and the reason is
 * fully understood" -- retrying with the same idempotency key would not
 * help (the request itself needs to change, or access needs to be
 * restored), so the pending key is cleared. Distinct from network
 * failure/malformed response/unknown outcome/503, which preserve the key
 * for a safe same-key retry. */
const KNOWN_TERMINAL_ERROR_CODES = new Set([
  "forbidden",
  "not_found",
  "validation_failed",
  "too_many_candidates",
]);

type ValidatedResultRow = {
  candidateId: string;
  resultCode: string;
  decision: string | null;
  reasonCode: string | null;
};

type ParsedPreparationResponse =
  | { ok: true; code: "ok"; results: ValidatedResultRow[] }
  | { ok: false; code: string };

/** Strict, fail-closed parse of the mutation API's response body. Anything
 * outside the exact allowed shape -- extra/missing keys, wrong types, an
 * unknown resultCode/decision/reasonCode, a decision/reasonCode pairing
 * that does not match the mutation API's own contract, a candidateId that
 * was not part of this exact request, a duplicate candidateId, a missing
 * candidateId, a status/code pairing the route would never actually send,
 * or a summary total that does not match the actual per-candidate rows --
 * is treated as an unknown/failed request, never as a partial success. */
function parsePreparationApiResponse(
  raw: unknown,
  httpStatus: number,
  requestedCandidateIds: string[],
): ParsedPreparationResponse | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const body = raw as Record<string, unknown>;

  if (typeof body.ok !== "boolean" || typeof body.code !== "string") {
    return null;
  }

  const acceptableStatuses = ACCEPTABLE_STATUS_BY_CODE[body.code];

  if (!acceptableStatuses || !acceptableStatuses.includes(httpStatus)) {
    return null;
  }

  if (body.ok !== (body.code === "ok")) {
    return null;
  }

  if (!body.ok) {
    for (const key of Object.keys(body)) {
      if (key !== "ok" && key !== "code") {
        return null;
      }
    }

    return { ok: false, code: body.code };
  }

  for (const key of Object.keys(body)) {
    if (key !== "ok" && key !== "code" && key !== "summary" && key !== "results") {
      return null;
    }
  }

  if (!body.summary || typeof body.summary !== "object" || Array.isArray(body.summary)) {
    return null;
  }

  const summary = body.summary as Record<string, unknown>;
  const summaryKeys = [
    "total",
    "created",
    "replayed",
    "autoPrepared",
    "ownerExceptionRequired",
    "itemAlreadyExists",
    "idempotencyConflict",
    "notEligible",
    "invalidCandidate",
  ] as const;

  for (const key of Object.keys(summary)) {
    if (!(summaryKeys as readonly string[]).includes(key)) {
      return null;
    }
  }

  for (const key of summaryKeys) {
    const value = summary[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      return null;
    }
  }

  if (!Array.isArray(body.results)) {
    return null;
  }

  const requestedIdSet = new Set(requestedCandidateIds.map((id) => id.toLowerCase()));
  const seenCandidateIds = new Set<string>();
  const results: ValidatedResultRow[] = [];

  const counts = {
    created: 0,
    replayed: 0,
    autoPrepared: 0,
    ownerExceptionRequired: 0,
    itemAlreadyExists: 0,
    idempotencyConflict: 0,
    notEligible: 0,
    invalidCandidate: 0,
  };

  for (const rawResult of body.results) {
    if (!rawResult || typeof rawResult !== "object" || Array.isArray(rawResult)) {
      return null;
    }

    const resultRow = rawResult as Record<string, unknown>;

    for (const key of Object.keys(resultRow)) {
      if (key !== "candidateId" && key !== "resultCode" && key !== "decision" && key !== "reasonCode") {
        return null;
      }
    }

    const candidateIdRaw = resultRow.candidateId;

    if (typeof candidateIdRaw !== "string" || !CANDIDATE_ID_PATTERN.test(candidateIdRaw)) {
      return null;
    }

    const candidateId = candidateIdRaw.toLowerCase();

    if (!requestedIdSet.has(candidateId) || seenCandidateIds.has(candidateId)) {
      return null;
    }

    seenCandidateIds.add(candidateId);

    const resultCode = resultRow.resultCode;

    if (typeof resultCode !== "string" || !KNOWN_RESULT_CODES.has(resultCode)) {
      return null;
    }

    const decisionRaw = resultRow.decision;
    const reasonCodeRaw = resultRow.reasonCode;

    if (resultCode === "created" || resultCode === "replayed") {
      if (typeof decisionRaw !== "string" || !KNOWN_MUTATION_DECISIONS.has(decisionRaw)) {
        return null;
      }

      if (
        typeof reasonCodeRaw !== "string" ||
        !REASON_CODES_BY_MUTATION_DECISION[decisionRaw].has(reasonCodeRaw)
      ) {
        return null;
      }

      counts[resultCode] += 1;

      if (decisionRaw === "auto_prepared") {
        counts.autoPrepared += 1;
      } else {
        counts.ownerExceptionRequired += 1;
      }
    } else {
      if (decisionRaw !== null || reasonCodeRaw !== null) {
        return null;
      }

      switch (resultCode) {
        case "item_already_exists":
          counts.itemAlreadyExists += 1;
          break;
        case "idempotency_conflict":
          counts.idempotencyConflict += 1;
          break;
        case "not_eligible":
          counts.notEligible += 1;
          break;
        case "invalid_candidate":
          counts.invalidCandidate += 1;
          break;
      }
    }

    results.push({
      candidateId,
      resultCode,
      decision: typeof decisionRaw === "string" ? decisionRaw : null,
      reasonCode: typeof reasonCodeRaw === "string" ? reasonCodeRaw : null,
    });
  }

  // Every requested candidate must be accounted for exactly once -- no
  // fewer, no more (a foreign/duplicate id already failed above).
  if (results.length !== requestedIdSet.size) {
    return null;
  }

  if (
    summary.total !== results.length ||
    summary.created !== counts.created ||
    summary.replayed !== counts.replayed ||
    summary.autoPrepared !== counts.autoPrepared ||
    summary.ownerExceptionRequired !== counts.ownerExceptionRequired ||
    summary.itemAlreadyExists !== counts.itemAlreadyExists ||
    summary.idempotencyConflict !== counts.idempotencyConflict ||
    summary.notEligible !== counts.notEligible ||
    summary.invalidCandidate !== counts.invalidCandidate
  ) {
    return null;
  }

  return { ok: true, code: "ok", results };
}

type MessageTone = "success" | "info" | "warning" | "error";

type PageMessage = { tone: MessageTone; text: string };

function messageStyle(tone: MessageTone): { border: string; background: string; color: string } {
  switch (tone) {
    case "success":
      return { border: "border-emerald-500/40", background: "bg-emerald-500/10", color: "text-emerald-100" };
    case "info":
      return { border: "border-slate-600", background: "bg-slate-800/60", color: "text-slate-200" };
    case "warning":
      return { border: "border-amber-500/40", background: "bg-amber-500/10", color: "text-amber-100" };
    case "error":
      return { border: "border-rose-500/40", background: "bg-rose-500/10", color: "text-rose-100" };
  }
}

function describeExceptionReason(reasonCode: string | null): string {
  switch (reasonCode) {
    case "MISSING_REQUIRED_FIELD":
      return "필수 항목(작업명 또는 위험요인)이 비어 있어 예외로 기록되었습니다.";
    case "MAPPING_CONFLICT":
      return "열 매핑이 변경되어 확인이 필요한 예외로 기록되었습니다.";
    default:
      return "예외로 기록되었습니다.";
  }
}

/** Per-row mutation-result wording. Distinguishes every outcome the API
 * can return; never describes ok=true as "every candidate was prepared". */
function describeCandidateResult(row: ValidatedResultRow): PageMessage {
  switch (row.resultCode) {
    case "created":
      return row.decision === "auto_prepared"
        ? { tone: "success", text: "공유 초안이 생성되었습니다." }
        : { tone: "warning", text: describeExceptionReason(row.reasonCode) };
    case "replayed":
      return row.decision === "auto_prepared"
        ? { tone: "info", text: "이전에 처리된 요청입니다. (공유 초안 생성됨)" }
        : { tone: "info", text: `이전에 처리된 요청입니다. (${describeExceptionReason(row.reasonCode)})` };
    case "item_already_exists":
      return { tone: "info", text: "이미 준비된 항목입니다." };
    case "not_eligible":
      return { tone: "warning", text: "현재 상태에서는 준비할 수 없습니다. 새로고침 후 다시 확인해 주세요." };
    case "invalid_candidate":
      return { tone: "error", text: "요청한 항목을 확인할 수 없습니다. 새로고침 후 다시 확인해 주세요." };
    case "idempotency_conflict":
    default:
      return { tone: "error", text: "요청 상태를 확인할 수 없습니다. 새로고침 후 다시 시도해 주세요." };
  }
}

const BADGE_BASE_CLASS = "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black";

function CategoryBadge({ entry }: { entry: Extract<PreparationClientEntry, { kind: "valid" }> }) {
  if (entry.category === "recorded_exception") {
    return (
      <span className={`${BADGE_BASE_CLASS} border-amber-500/40 bg-amber-500/10 text-amber-200`}>
        기록된 예외
      </span>
    );
  }

  if (entry.category === "awaiting_preparation_request") {
    return entry.mappingMismatch || entry.missingRequiredField ? (
      <span className={`${BADGE_BASE_CLASS} border-amber-500/40 bg-amber-500/10 text-amber-200`}>
        준비 요청 가능 · 확인 필요
      </span>
    ) : (
      <span className={`${BADGE_BASE_CLASS} border-emerald-500/40 bg-emerald-500/10 text-emerald-200`}>
        준비 요청 가능
      </span>
    );
  }

  if (entry.category === "already_prepared") {
    return (
      <span className={`${BADGE_BASE_CLASS} border-sky-500/40 bg-sky-500/10 text-sky-200`}>이미 준비됨</span>
    );
  }

  return (
    <span className={`${BADGE_BASE_CLASS} border-slate-600 text-slate-300`}>해당 없음</span>
  );
}

export default function PreparationClient({
  sourceId,
  companyCode,
  companyLabel,
  sourcesHref,
  listStatus,
  sourceTitle,
  siteName,
  entries,
  summary,
  overflow,
}: PreparationClientProps) {
  const router = useRouter();

  const apiUrl = useMemo(
    () => `/api/risk-share/manager/preparation?company=${encodeURIComponent(companyCode)}`,
    [companyCode],
  );

  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [resultByCandidateId, setResultByCandidateId] = useState<Map<string, ValidatedResultRow>>(
    () => new Map(),
  );
  const [pendingIdempotencyKey, setPendingIdempotencyKey] = useState<string | null>(null);
  const [pendingSelectionSignature, setPendingSelectionSignature] = useState<string | null>(null);

  // Fail-closed gate: no selection UI at all unless the list is a complete,
  // successfully loaded, non-overflowing snapshot. overflow/isComplete are
  // exact negations of each other in the Read Model's own contract, but
  // both are checked here rather than trusting only one.
  const actionsAllowed = listStatus === "ok" && !overflow && summary !== null && summary.isComplete;

  // Server state changing -- a real refetch after a mutation, or any other
  // server-side drift in any action-relevant authoritative field (page-level
  // or per-entry) -- must reset local selection/pending-key state, per
  // "clear the idempotency key after authoritative state has changed".
  // Adjust-state-during-render (no useEffect), same pattern as
  // ShareReviewClient's per-item resync.
  const serverStateSignature = useMemo(
    () =>
      JSON.stringify({
        sourceId,
        listStatus,
        overflow,
        summaryIsComplete: summary?.isComplete ?? null,
        entries: entries.map((entry) =>
          entry.kind === "valid"
            ? [
                entry.kind,
                entry.candidateId,
                entry.taskName,
                entry.hazard,
                entry.reviewerStatus,
                entry.category,
                entry.hasItem,
                entry.latestDecision,
                entry.latestReasonCode,
                entry.mappingMismatch,
                entry.missingRequiredField,
              ]
            : [entry.kind, entry.candidateId],
        ),
      }),
    [sourceId, listStatus, overflow, summary?.isComplete, entries],
  );
  const [syncedServerStateSignature, setSyncedServerStateSignature] = useState(serverStateSignature);

  if (serverStateSignature !== syncedServerStateSignature) {
    setSyncedServerStateSignature(serverStateSignature);
    setSelectedCandidateIds(new Set());
    setPendingIdempotencyKey(null);
    setPendingSelectionSignature(null);
    setResultByCandidateId(new Map());
  }

  function toggleCandidate(entry: Extract<PreparationClientEntry, { kind: "valid" }>) {
    if (submitting || !actionsAllowed || entry.category !== "awaiting_preparation_request") {
      return;
    }

    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);

      if (next.has(entry.candidateId)) {
        next.delete(entry.candidateId);
      } else if (next.size < MAX_CANDIDATE_IDS) {
        next.add(entry.candidateId);
      }

      return next;
    });
  }

  async function submitPreparation() {
    if (submitting || !actionsAllowed) {
      return;
    }

    const selected = Array.from(selectedCandidateIds);

    if (selected.length === 0 || selected.length > MAX_CANDIDATE_IDS) {
      return;
    }

    const selectionSignature = JSON.stringify([...selected].sort());

    let idempotencyKey: string;

    if (pendingIdempotencyKey && pendingSelectionSignature === selectionSignature) {
      idempotencyKey = pendingIdempotencyKey;
    } else {
      idempotencyKey = crypto.randomUUID();
      setPendingIdempotencyKey(idempotencyKey);
      setPendingSelectionSignature(selectionSignature);
    }

    setSubmitting(true);
    setMessage(null);

    let response: Response;

    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId,
          candidateIds: selected,
          idempotencyKey,
        }),
      });
    } catch {
      // Network failure: preserve the pending key/signature for a safe
      // same-key retry.
      setSubmitting(false);
      setMessage({ tone: "error", text: "요청을 처리하지 못했습니다. 다시 시도해 주세요." });
      return;
    }

    let rawData: unknown;

    try {
      rawData = await response.json();
    } catch {
      // Malformed response body: preserve the pending key/signature.
      setSubmitting(false);
      setMessage({ tone: "error", text: "요청 결과를 확인하지 못했습니다. 다시 시도해 주세요." });
      return;
    }

    setSubmitting(false);

    const parsed = parsePreparationApiResponse(rawData, response.status, selected);

    if (!parsed) {
      // Unknown/malformed structured response: preserve the pending key so
      // a manual retry replays safely instead of risking a second mutation.
      setMessage({
        tone: "error",
        text: "요청 결과를 확인할 수 없습니다. 다시 시도해 주세요.",
      });
      return;
    }

    if (!parsed.ok) {
      if (KNOWN_TERMINAL_ERROR_CODES.has(parsed.code)) {
        // A fully-understood terminal outcome where nothing was applied --
        // retrying with the same key would not help (the request itself,
        // or access, needs to change first).
        setPendingIdempotencyKey(null);
        setPendingSelectionSignature(null);
      }
      // request_failed / invalid_response (503): preserve the pending key.

      const errorMessages: Record<string, string> = {
        forbidden: "접근 권한이 확인되지 않았습니다. 새로고침 후 다시 시도해 주세요.",
        not_found: "원본을 찾을 수 없습니다. 새로고침 후 다시 확인해 주세요.",
        validation_failed: "요청 내용을 확인할 수 없습니다. 새로고침 후 다시 시도해 주세요.",
        too_many_candidates: "한 번에 요청할 수 있는 항목 수를 초과했습니다.",
        request_failed: "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
        invalid_response: "요청 결과를 확인하지 못했습니다. 다시 시도해 주세요.",
      };

      setMessage({
        tone: "error",
        text: errorMessages[parsed.code] ?? "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
      });
      return;
    }

    // Known terminal response: the pending key's job is done. Never
    // describe ok=true as "every candidate was prepared" -- the per-row
    // results below are the only place individual outcomes are stated.
    setPendingIdempotencyKey(null);
    setPendingSelectionSignature(null);
    setSelectedCandidateIds(new Set());

    const nextResultByCandidateId = new Map<string, ValidatedResultRow>();
    for (const row of parsed.results) {
      nextResultByCandidateId.set(row.candidateId, row);
    }
    setResultByCandidateId(nextResultByCandidateId);

    setMessage({
      tone: "info",
      text: "요청이 처리되었습니다. 아래에서 항목별 결과를 확인해 주세요.",
    });

    // Mutation response is immediate feedback only -- authoritative
    // current state always comes from a fresh Read Model read, never from
    // trusting this response as the new displayed state.
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
      <section className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          이 화면은 항목 준비 요청만 처리합니다. 공유본 게시나 근로자·고객 공개 상태는 변경되지 않습니다.
        </div>

        <div className="mt-5 flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">{companyLabel}</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">항목 준비 상태</h1>
            {listStatus === "ok" ? (
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                {sourceTitle || "제목 없는 원본"}
                {siteName ? ` · ${siteName}` : ""}
              </p>
            ) : null}
          </div>

          <a
            href={sourcesHref}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-3 text-sm font-black text-slate-200 hover:bg-slate-800"
          >
            관리자 원본 목록으로 돌아가기
          </a>
        </div>

        {message ? (
          <div
            className={`mt-6 rounded-2xl border ${messageStyle(message.tone).border} ${messageStyle(message.tone).background} p-4 text-sm leading-6 ${messageStyle(message.tone).color}`}
            role="status"
          >
            {message.text}
          </div>
        ) : null}

        {listStatus === "failed" ? (
          <div className="mt-6 rounded-3xl border border-rose-500/40 bg-rose-500/10 p-5 text-sm leading-6 text-rose-100">
            항목 준비 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        ) : null}

        {listStatus === "empty" ? (
          <div className="mt-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100">
            현재 확인할 수 있는 항목이 없습니다. 원본 등록과 열 매핑 상태를 확인해 주세요.
          </div>
        ) : null}

        {listStatus === "ok" && !actionsAllowed ? (
          <div className="mt-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100">
            확인할 항목이 많아 전체 목록을 안전하게 표시하지 못했습니다. 운영 담당자에게 확인해 주세요.
          </div>
        ) : null}

        {listStatus === "ok" && actionsAllowed ? (
          <div className="mt-6 space-y-3">
            {entries.map((entry, index) => {
              if (entry.kind === "invalid") {
                return (
                  <article
                    key={entry.candidateId ?? `invalid-${index}`}
                    className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4"
                  >
                    <p className="text-sm font-black text-amber-100">
                      데이터 상태를 확인해야 하는 항목입니다.
                    </p>
                  </article>
                );
              }

              const selectable = entry.category === "awaiting_preparation_request";
              const checked = selectedCandidateIds.has(entry.candidateId);
              const rowResult = resultByCandidateId.get(entry.candidateId);
              const rowMessage = rowResult ? describeCandidateResult(rowResult) : null;

              return (
                <article
                  key={entry.candidateId}
                  className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {selectable ? (
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4"
                          checked={checked}
                          disabled={submitting}
                          onChange={() => toggleCandidate(entry)}
                          aria-label="항목 준비 요청 대상으로 선택"
                        />
                      ) : null}
                      <div>
                        <p className="text-sm font-black text-white">{entry.taskName || "작업명 미입력"}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{entry.hazard}</p>
                      </div>
                    </div>
                    <CategoryBadge entry={entry} />
                  </div>

                  {entry.category === "recorded_exception" ? (
                    <p className="mt-2 text-xs leading-5 text-amber-200">
                      {describeExceptionReason(entry.latestReasonCode)}
                    </p>
                  ) : null}

                  {entry.mappingMismatch ? (
                    <p className="mt-2 text-xs leading-5 text-amber-200">
                      열 매핑이 변경되어 확인이 필요합니다.
                    </p>
                  ) : null}

                  {entry.missingRequiredField ? (
                    <p className="mt-2 text-xs leading-5 text-amber-200">
                      작업명 또는 위험요인이 비어 있습니다.
                    </p>
                  ) : null}

                  {rowMessage ? (
                    <div
                      className={`mt-3 rounded-xl border ${messageStyle(rowMessage.tone).border} ${messageStyle(rowMessage.tone).background} p-3 text-xs leading-5 ${messageStyle(rowMessage.tone).color}`}
                    >
                      {rowMessage.text}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}

        {listStatus === "ok" && actionsAllowed ? (
          <div className="sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl">
            <p className="text-xs font-bold text-slate-300">
              선택됨 {selectedCandidateIds.size}건
            </p>
            <button
              type="button"
              className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting || selectedCandidateIds.size === 0}
              onClick={() => void submitPreparation()}
            >
              {submitting ? "처리 중" : "선택한 항목 준비 요청"}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
