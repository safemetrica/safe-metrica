import LoginThemeProvider from "@/app/login/LoginThemeProvider";
import LoginThemeToggleButton from "@/app/login/LoginThemeToggleButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "입력 내용을 확인해 주세요. 비밀번호는 10자 이상이어야 합니다.",
  terms_required: "서비스 이용약관과 개인정보 처리방침에 동의해 주세요.",
  account_company_conflict: "이 계정은 이미 다른 회사에 연결되어 있습니다. 로그인해 주세요.",
  company_exists: "이미 등록된 회사입니다. 기존 관리자에게 계정 연결을 요청해 주세요.",
  signup_conflict: "이미 가입된 이메일이거나 가입 요청이 처리 중입니다. 로그인하거나 같은 정보로 다시 시도해 주세요.",
  service_unavailable: "가입을 완료하지 못했습니다. 잠시 후 같은 정보로 다시 시도해 주세요.",
  request_invalid: "가입 요청을 확인하지 못했습니다. 화면을 새로 열어 다시 시도해 주세요.",
  password_mismatch: "비밀번호가 서로 다릅니다. 다시 확인해 주세요.",
};

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function SignupPage({ searchParams }: { searchParams?: Promise<{ error?: string | string[] }> }) {
  const params = (await searchParams) ?? {};
  const error = ERROR_MESSAGES[readParam(params.error)] ?? "";

  return (
    <LoginThemeProvider>
      <div className="login-body">
        <div className="login-card">
          <LoginThemeToggleButton />
          <aside className="login-visual">
            <p className="login-visual__eyebrow">Start Safe Operations</p>
            <h1>가입하고 바로<br />안전운영을 시작하세요</h1>
            <p className="login-visual__sub">회사와 관리자 계정을 한 번에 준비합니다</p>
          </aside>
          <main className="login-form">
            <div className="login-form__top">이미 계정이 있나요? <Link href="/login" style={{ color: "var(--brand-600)", fontWeight: 800 }}>로그인</Link></div>
            <div className="login-form__mid">
              <img className="login-logo logo-img logo-img--light" src="/risk-share-assets/logo.png" alt="SafeMetrica" />
              <img className="login-logo logo-img logo-img--dark" src="/risk-share-assets/logo_darkmode.png" alt="SafeMetrica" />
              <h1 className="login-title">회사 관리자 가입<small>계정과 회사를 만들고 운영 준비를 이어갑니다</small></h1>
              {error ? <p className="login-error" style={{ textAlign: "left" }}>{error}</p> : null}
              <form action="/api/self-service/signup" method="post">
                <div className="kfld"><div className="kfld__main"><label className="kfld__label" htmlFor="companyName">회사명</label><input id="companyName" name="companyName" required minLength={2} maxLength={120} autoComplete="organization" placeholder="예: 세이프 제조" /></div><span className="kfld__ic"><iconify-icon icon="lucide:building-2"></iconify-icon></span></div>
                <div className="kfld"><div className="kfld__main"><label className="kfld__label" htmlFor="displayName">담당자 이름</label><input id="displayName" name="displayName" required minLength={2} maxLength={80} autoComplete="name" placeholder="이름" /></div><span className="kfld__ic"><iconify-icon icon="lucide:user"></iconify-icon></span></div>
                <div className="kfld"><div className="kfld__main"><label className="kfld__label" htmlFor="email">이메일</label><input id="email" name="email" type="email" required maxLength={320} autoComplete="username" placeholder="name@company.com" /></div><span className="kfld__ic"><iconify-icon icon="lucide:mail"></iconify-icon></span></div>
                <div className="kfld"><div className="kfld__main"><label className="kfld__label" htmlFor="password">비밀번호</label><input id="password" name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" placeholder="10자 이상" /></div><span className="kfld__ic"><iconify-icon icon="lucide:lock-keyhole"></iconify-icon></span></div>
                <div className="kfld"><div className="kfld__main"><label className="kfld__label" htmlFor="passwordConfirm">비밀번호 확인</label><input id="passwordConfirm" name="passwordConfirm" type="password" required minLength={10} maxLength={128} autoComplete="new-password" placeholder="비밀번호 다시 입력" /></div><span className="kfld__ic"><iconify-icon icon="lucide:shield-check"></iconify-icon></span></div>
                <div aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}><label htmlFor="website">웹사이트</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
                <label className="login-remember"><input type="checkbox" name="termsAccepted" value="yes" required /> 이용약관과 개인정보 처리방침에 동의합니다</label>
                <div className="login-row"><span className="login-forgot">다음 단계에서 회사 운영정보를 입력합니다</span><button type="submit" className="login-submit" aria-label="가입"><iconify-icon icon="lucide:arrow-right"></iconify-icon></button></div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </LoginThemeProvider>
  );
}
