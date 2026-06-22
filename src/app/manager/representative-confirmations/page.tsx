import Link from "next/link";

import { SafeNav } from "@/components/SafeLayout";
import { getCompanyConfig, getCompanyConfigByCode } from "@/lib/company";
import {
  fetchWorkerRepresentativeConfirmationLinks,
  type WorkerRepresentativeConfirmationLink,
} from "@/lib/workerRepresentativeConfirmationLinks";
import {
  fetchWorkerRepresentativeConfirmationRecords,
  type WorkerRepresentativeConfirmationRecord,
  type WorkerRepresentativeReviewStatus,
} from "@/lib/workerRepresentativeConfirmationRecords";

import RepresentativeConfirmationLinkBuilder from "./RepresentativeConfirmationLinkBuilder";
import RevokeRepresentativeConfirmationLinkButton from "./RevokeRepresentativeConfirmationLinkButton";

export const dynamic = "force-dynamic";

const REVIEW_STATUS_CLASS: Record<WorkerRepresentativeReviewStatus, string> = {
  미확인: "border-slate-600 bg-slate-800 text-slate-200",
  확인: "border-blue-500/50 bg-blue-500/15 text-blue-200",
  "검토 필요": "border-amber-500/50 bg-amber-500/15 text-amber-200",
  "이견 검토 중": "border-orange-500/50 bg-orange-500/15 text-orange-200",
  "보완 요청": "border-rose-500/50 bg-rose-500/15 text-rose-200",
  "검토 완료": "border-emerald-500/50 bg-emerald-500/15 text-emerald-200",
  반려: "border-red-500/50 bg-red-500/15 text-red-200",
};

const REVIEW_STATUS_LABEL: Record<WorkerRepresentativeReviewStatus, string> = {
  미확인: "미확인",
  확인: "확인",
  "검토 필요": "검토 필요",
  "이견 검토 중": "보완 의견 검토 중",
  "보완 요청": "보완 요청",
  "검토 완료": "검토 완료",
  반려: "반려",
};

function formatSubmittedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getConfirmationScope(record: WorkerRepresentativeConfirmationRecord) {
  if (record.confirmationScope) {
    return record.confirmationScope;
  }

  if (record.riskAssessmentId) {
    return `위험성평가 ${record.riskAssessmentId}`;
  }

  return "확인 내용이 기록되지 않았습니다.";
}

function getDefaultConfirmationScope() {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return `${year ?? ""}년 ${month ?? ""} 정기 위험성평가 및 작업별 안전조치 공유확인`;
}

function ConfirmationCard({
  record,
}: {
  record: WorkerRepresentativeConfirmationRecord;
}) {
  const opinionDetail = record.objectionDetail || record.opinion;

  return (
    <article
      className={`rounded-3xl border p-5 shadow-lg sm:p-6 ${
        record.hasObjection
          ? "border-amber-400/60 bg-amber-950/25 shadow-amber-950/20"
          : "border-slate-700 bg-slate-900/80 shadow-slate-950/20"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                record.hasObjection
                  ? "border-amber-400/60 bg-amber-400/15 text-amber-200"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {record.hasObjection ? "보완 의견 있음" : "별도 의견 없음"}
            </span>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${REVIEW_STATUS_CLASS[record.reviewStatus]}`}
            >
              {REVIEW_STATUS_LABEL[record.reviewStatus]}
            </span>
          </div>
          <h2 className="mt-3 break-words text-xl font-black text-white">
            {record.siteName || "현장명 미입력"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            {getConfirmationScope(record)}
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-xs font-bold text-slate-500">제출 일시</p>
          <time
            dateTime={record.submittedAt}
            className="mt-1 block text-sm font-bold text-slate-200"
          >
            {formatSubmittedAt(record.submittedAt)}
          </time>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/50 p-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-bold text-slate-500">근로자대표 성명</dt>
          <dd className="mt-1 text-sm font-bold text-white">
            {record.representativeName}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-slate-500">소속/작업조</dt>
          <dd className="mt-1 text-sm font-bold text-white">
            {record.representativeDepartment || "미입력"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-slate-500">역할</dt>
          <dd className="mt-1 text-sm font-bold text-white">
            {record.representativeRole}
          </dd>
        </div>
      </dl>

      {opinionDetail ? (
        <section
          className={`mt-4 rounded-2xl border p-4 ${
            record.hasObjection
              ? "border-amber-400/40 bg-amber-500/10"
              : "border-slate-700 bg-slate-950/40"
          }`}
        >
          <h3
            className={`text-xs font-black ${
              record.hasObjection ? "text-amber-200" : "text-slate-400"
            }`}
          >
            {record.hasObjection ? "보완 의견 내용" : "추가 의견"}
          </h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">
            {opinionDetail}
          </p>
        </section>
      ) : null}
    </article>
  );
}

function formatOptionalDateTime(value: string | null) {
  if (!value) {
    return "없음";
  }

  return formatSubmittedAt(value);
}

function getLinkStatus(link: WorkerRepresentativeConfirmationLink) {
  if (link.status === "revoked") {
    return "폐기됨";
  }

  const expiresAt = link.expiresAt ? Date.parse(link.expiresAt) : null;

  if (
    expiresAt !== null &&
    (!Number.isFinite(expiresAt) || expiresAt <= Date.now())
  ) {
    return "만료됨";
  }

  return "사용 가능";
}

function getLinkStatusClass(status: string) {
  if (status === "사용 가능") {
    return "border-emerald-500/50 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "만료됨") {
    return "border-amber-500/50 bg-amber-500/10 text-amber-200";
  }

  return "border-rose-500/50 bg-rose-500/10 text-rose-200";
}

function LinkManagementCard({ link }: { link: WorkerRepresentativeConfirmationLink }) {
  const status = getLinkStatus(link);

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${getLinkStatusClass(status)}`}
            >
              {status}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-black text-slate-300">
              최근 접근: {formatOptionalDateTime(link.lastUsedAt)}
            </span>
          </div>
          <h3 className="mt-3 break-words text-base font-black text-white">
            {link.siteName}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-300">
            {link.confirmationScope}
          </p>
        </div>
        <RevokeRepresentativeConfirmationLinkButton
          linkId={link.linkId}
          disabled={link.status === "revoked"}
        />
      </div>

      <dl className="mt-4 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs sm:grid-cols-3">
        <div>
          <dt className="font-bold text-slate-500">생성</dt>
          <dd className="mt-1 font-bold text-slate-200">
            {formatOptionalDateTime(link.createdAt)}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-slate-500">만료</dt>
          <dd className="mt-1 font-bold text-slate-200">
            {formatOptionalDateTime(link.expiresAt)}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-slate-500">링크 관리 기준</dt>
          <dd className="mt-1 font-bold text-slate-200">
            폐기 또는 만료 시 제출 차단
          </dd>
        </div>
      </dl>
    </article>
  );
}

function LinkStorageNotice({ message }: { message: string }) {
  return (
    <section className="mt-6 rounded-3xl border border-slate-700 bg-slate-900/70 p-5">
      <h2 className="text-lg font-black text-white">근로자대표 확인 링크 관리</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
    </section>
  );
}

function SafeNotice({ message }: { message: string }) {
  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 text-center">
      <p className="text-base font-bold text-white">{message}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        잠시 후 다시 확인하거나 시스템 관리자에게 문의해주세요.
      </p>
    </section>
  );
}

type RepresentativeConfirmationsSearchParams = {
  company?: string | string[];
};

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function getRepresentativeConfirmationsCompany(
  searchParams?: RepresentativeConfirmationsSearchParams,
) {
  const rawCompanyQuery = getSingleSearchParam(searchParams?.company);

  if (rawCompanyQuery === "richi") {
    return getCompanyConfigByCode("richi").catch(() => null);
  }

  return getCompanyConfig().catch(() => null);
}

export default async function RepresentativeConfirmationsPage({
  searchParams,
}: {
  searchParams?: Promise<RepresentativeConfirmationsSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const company = await getRepresentativeConfirmationsCompany(params);

  if (!company) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <SafeNav company="회사 선택 필요" />
        <div className="mx-auto max-w-5xl px-5 py-10">
          <SafeNotice message="접수 내역을 조회할 사업장을 확인할 수 없습니다." />
          <div className="mt-5 text-center">
            <Link
              href="/select-tenant"
              className="inline-flex rounded-full bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-500"
            >
              사업장 선택
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [result, linkResult] = await Promise.all([
    fetchWorkerRepresentativeConfirmationRecords(company.code),
    fetchWorkerRepresentativeConfirmationLinks(company.code),
  ]);
  const objectionCount = result.records.filter(
    (record) => record.hasObjection,
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 pb-12 text-slate-100">
      <SafeNav company={company.name} />

      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black text-blue-300">관리자 운영기록</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">
              근로자대표 참여확인 접수함
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              근로자대표가 제출한 확인 및 보완 의견을 확인합니다.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex w-fit shrink-0 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-200 hover:border-blue-500 hover:text-white"
          >
            대시보드로 돌아가기
          </Link>
        </div>

        <section className="mt-6 rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 py-3 text-sm leading-6 text-blue-100">
          이 화면은 운영기록 확인을 돕기 위한 화면이며, 최종 검토와 조치는
          관리자와 사업주가 결정합니다.
        </section>

        <RepresentativeConfirmationLinkBuilder
          defaultConfirmationScope={getDefaultConfirmationScope()}
        />

        {linkResult.status === "ok" ? (
          <section className="mt-6 rounded-3xl border border-slate-700 bg-slate-950/40 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black tracking-wide text-cyan-300">
                  링크 운영 통제
                </p>
                <h2 className="mt-1 text-xl font-black text-white">
                  최근 발급 링크
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  폐기 또는 만료된 링크는 근로자대표 참여확인 제출에 사용할 수 없습니다. 최근 접근은 제출 완료가 아니라 링크 조회 시각입니다.
                </p>
              </div>
              <span className="w-fit rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-200">
                {linkResult.links.length}개
              </span>
            </div>

            {linkResult.links.length > 0 ? (
              <div className="mt-4 space-y-3">
                {linkResult.links.map((link) => (
                  <LinkManagementCard key={link.linkId} link={link} />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-400">
                아직 발급된 근로자대표 참여확인 링크가 없습니다.
              </div>
            )}
          </section>
        ) : (
          <LinkStorageNotice message="근로자대표 확인 링크 목록을 불러오지 못했습니다. 저장소 설정 또는 원장 상태를 확인해주세요." />
        )}

        {result.status === "ok" ? (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                <p className="text-xs font-bold text-slate-500">조회 사업장</p>
                <p className="mt-1 text-base font-black text-white">
                  {company.name}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                <p className="text-xs font-bold text-slate-500">전체 제출</p>
                <p className="mt-1 text-2xl font-black text-white">
                  {result.records.length}건
                </p>
              </div>
              <div
                className={`rounded-2xl border p-4 ${
                  objectionCount > 0
                    ? "border-amber-400/50 bg-amber-500/10"
                    : "border-slate-700 bg-slate-900"
                }`}
              >
                <p className="text-xs font-bold text-slate-500">보완 의견 있음</p>
                <p
                  className={`mt-1 text-2xl font-black ${
                    objectionCount > 0 ? "text-amber-200" : "text-white"
                  }`}
                >
                  {objectionCount}건
                </p>
              </div>
            </section>

            {result.records.length > 0 ? (
              <section className="mt-6 space-y-4" aria-label="참여확인 제출 목록">
                {result.records.map((record) => (
                  <ConfirmationCard
                    key={record.confirmationId}
                    record={record}
                  />
                ))}
              </section>
            ) : (
              <section className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
                <p className="text-base font-bold text-white">
                  아직 접수된 참여확인 기록이 없습니다.
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  제출이 접수되면 최근 제출순으로 표시됩니다.
                </p>
              </section>
            )}
          </>
        ) : (
          <div className="mt-6">
            <SafeNotice message="근로자대표 참여확인 접수 내역을 불러오지 못했습니다." />
          </div>
        )}
      </div>
    </main>
  );
}
