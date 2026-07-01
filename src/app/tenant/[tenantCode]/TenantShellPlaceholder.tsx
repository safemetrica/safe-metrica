import { normalizeTenantLoginCode } from "@/lib/tenant-auth/tenantAuthGuards";

const LEGACY_TENANT_CODES = new Set([
  "daedo",
  "dongwoo",
  "hankookgreen",
  "bubblemon",
]);

type TenantShellPlaceholderProps = {
  children: React.ReactNode;
  tenantCode?: string | null;
};

export function TenantShellPlaceholder({
  children,
  tenantCode,
}: TenantShellPlaceholderProps) {
  const normalizedTenantCode = normalizeTenantLoginCode(tenantCode);
  const isLegacyTenant = LEGACY_TENANT_CODES.has(normalizedTenantCode);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="bg-slate-950 px-6 py-6 text-white lg:w-72">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/30">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">
              SafeMetrica 운영공간
            </p>
            <h1 className="mt-3 text-2xl font-black leading-tight">
              운영공간 전용 화면
            </h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-200">
              고객사별 운영공간을 안전하게 분리해 준비합니다.
            </p>
          </div>

          <nav aria-label="운영공간 준비 메뉴" className="mt-6 space-y-2">
            {["관리자 홈", "현장 QR", "접수함", "월간 운영기록"].map((item) => (
              <div
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-100"
                key={item}
              >
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <section className="flex-1">
          <header className="border-b border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                  운영공간
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {normalizedTenantCode}
                </p>
              </div>
              <div className="rounded-full bg-cyan-50 px-4 py-2 text-sm font-extrabold text-cyan-800 ring-1 ring-cyan-200">
                다른 회사 자료는 표시하지 않습니다.
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-6 py-8">
            {isLegacyTenant ? (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-900">
                기존 운영 고객은 현재 사용 중인 경로를 유지합니다. 이 준비 화면으로 강제 전환하지 않습니다.
              </div>
            ) : null}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              {children}
            </div>
          </main>
        </section>
      </div>
    </div>
  );
}
