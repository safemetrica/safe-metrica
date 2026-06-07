# `/home` 데이터 로딩 감사

## 1. 목적

이 문서는 SafeMetrica 정식 앱의 `/home` 첫 진입 성능을 개선하기 전에 현재 서버 렌더링 경로, 데이터 호출, 캐시 정책, 첫 렌더링 차단 지점을 코드 기준으로 기록한다.

이번 감사의 범위는 다음과 같다.

- 대상: `src/app/home/page.tsx`와 `/home`이 직접 import하거나 호출하는 관련 `lib`, `components`, Route Handler
- 성격: 현황 감사와 후속 작업 제안
- 제외: 기능 변경, 성능 개선 코드 적용, API·DB·Notion·Supabase·환경변수 변경, 응답 구조 변경, 대규모 UI 변경
- 주의: 아래 병목은 계측 결과가 아니라 현재 `await` 순서와 네트워크 경계를 바탕으로 한 **병목 후보**다. 실제 기여도와 p50/p95는 별도 계측이 필요하다.

## 2. 현재 `/home` 라우트 상태

- `/home`은 `export const dynamic = "force-dynamic"`으로 설정되어 동적 렌더링된다. (`src/app/home/page.tsx`)
- 페이지는 요청의 `searchParams`를 해석한 뒤 `getCompanyConfig()`를 `await`하여 tenant를 먼저 확인한다.
- `getCompanyConfig()`는 요청 header/cookie에서 고객사 코드를 판별하고, 해당 코드로 Notion 고객사 설정을 조회한다. 운영 환경에서는 tenant가 없을 때 기본 고객사로 fallback하지 않는다. (`src/lib/company.ts`)
- 고객사 설정을 얻지 못하면 `/login?error=tenant_required`로 redirect한다.
- 고객사 코드가 `mons`이면 `/contractor/mons`로 redirect한다.
- redirect를 통과한 요청은 역할별 핵심 홈 정보와 링크를 계산한 후 날씨, Google RSS 뉴스, 안전사고 사례를 차례로 준비한다.
- `getTbmFormUrl()`은 이미 조회된 tenant 설정에서 URL을 계산하는 동기 helper이며 추가 네트워크 호출이 없다. `TbmFormAction`도 전달받은 링크를 렌더링할 뿐 서버 데이터 fetch를 추가하지 않는다.
- `/home` 본문에는 현재 `Suspense` 경계나 독립적인 후순위 서버 컴포넌트가 없다. 따라서 뉴스·안전사고 사례 같은 부가 콘텐츠도 페이지 함수가 반환되기 전에 준비된다.
- tenant 확인과 핵심 역할 홈은 접근 제어와 주 사용 흐름에 해당하므로 먼저 렌더링되어야 한다. 뉴스·안전사고 사례·부가 브리핑은 후순위 분리 후보로 본다.

## 3. 첫 렌더링 전 실행되는 작업

현재 페이지 함수의 주요 실행 순서는 아래와 같다.

1. `searchParams`를 해석하고 활성 역할 및 날씨 테스트 모드를 결정한다.
2. `await getCompanyConfig()`로 tenant를 확인한다.
   - 요청 header/cookie 확인
   - 고객사 코드 검증
   - Notion 고객사 DB 조회
3. tenant가 없으면 `/login?error=tenant_required`로 redirect한다.
4. `company.code === "mons"`이면 `/contractor/mons`로 redirect한다.
5. 역할별 핵심 홈 콘텐츠와 TBM 링크를 계산한다. 이 단계는 추가 fetch를 하지 않는다.
6. `await getWeather()`를 실행한다.
   - 기상청 초단기실황 fetch
   - 기상청 단기예보 fetch
   - 두 호출은 `Promise.all`로 병렬 실행
   - 두 호출 모두 `next: { revalidate: 7200 }` 사용
7. Google RSS 3종을 `/home` 서버 렌더링 중 직접 fetch한다.
   - 세 호출은 `Promise.allSettled`로 병렬 실행
   - 다만 날씨 작업이 끝난 뒤 이 묶음을 시작한다.
8. 내부 `/api/safety-news`를 `cache: "no-store"`로 호출한다.
   - 개발 환경: `http://localhost:3000`
   - 운영 환경: `https://safe-metrica.vercel.app`
   - tenant 식별 정보를 query parameter로 전달한다.
9. `/api/safety-news` Route Handler는 tenant 문맥을 정한 후 KOSHA 외부 API를 `cache: "no-store"`로 호출할 수 있다. 업종별 여러 keyword 호출은 Route Handler 내부에서 `Promise.allSettled`로 병렬 실행된다.
10. 위 작업이 완료되거나 각 fallback 경로가 결정된 뒤 `/home` JSX를 반환한다.

현재 구조를 직렬 구간 중심으로 단순화하면 다음과 같다.

```text
요청
  → tenant 확인 + Notion 설정 조회
  → redirect 판정
  → 날씨 2종(병렬)
  → Google RSS 3종(병렬)
  → 내부 /api/safety-news
      → KOSHA keyword 호출들(병렬, 설정 시)
  → /home 응답 렌더링
```

즉 각 묶음 안에서는 병렬화가 되어 있지만, `tenant → 날씨 → RSS → 내부 API` 묶음은 페이지 함수 안에서 순차적으로 `await`된다. 대략적인 서버 대기시간은 각 묶음의 최장 호출 시간이 직렬로 누적되는 형태가 될 수 있다. 이 설명은 코드 구조에 따른 추론이며 실제 응답시간 계측값은 아니다.

## 4. 데이터 호출 목록

| 호출 위치 | 호출 대상 | 캐시 정책 | 첫 렌더링 차단 여부 | 병목 가능성 | 개선 후보 여부 |
| --- | --- | --- | --- | --- | --- |
| `src/app/home/page.tsx` → `src/lib/company.ts` | `getCompanyConfig()`; header/cookie tenant 확인 후 Notion 고객사 DB 조회 | `getCompanyConfig()` 자체 캐시 없음. Notion `POST fetch`에 명시적 `cache`/`revalidate` 없음 | **예**. redirect 및 tenant별 핵심 홈 구성 전에 반드시 완료 | 중간. 외부 Notion 왕복이 있으나 접근 제어상 필수 경로 | **조건부**. 제거하지 않고 별도 계측·안전성 검토만 가능 |
| `src/app/home/page.tsx`의 `getWeather()` | 기상청 초단기실황 `getUltraSrtNcst` fetch | `next: { revalidate: 7200 }` | **예**. 현재 페이지 반환 전에 `await` | 낮음~중간. 외부 호출이지만 2시간 재검증 정책이 이미 있음 | **낮은 우선순위**. 뉴스보다 후순위 |
| `src/app/home/page.tsx`의 `getWeather()` | 기상청 단기예보 `getVilageFcst` fetch | `next: { revalidate: 7200 }` | **예**. 현재 페이지 반환 전에 `await` | 낮음~중간. 초단기실황과 병렬이며 2시간 재검증 정책이 있음 | **낮은 우선순위**. 뉴스보다 후순위 |
| `src/app/home/page.tsx` | Google News RSS: `산업재해 사고` | 명시적 cache/revalidate 없음: `fetch(s.url)` | **예**. RSS 묶음을 `await Promise.allSettled(...)` | 높음. 외부 RSS 응답 지연이 페이지 응답 경로에 포함 | **예**. 별도 컴포넌트/API 캐시 후보 |
| `src/app/home/page.tsx` | Google News RSS: `안전사고 현장` | 명시적 cache/revalidate 없음: `fetch(s.url)` | **예** | 높음 | **예** |
| `src/app/home/page.tsx` | Google News RSS: `중대재해` | 명시적 cache/revalidate 없음: `fetch(s.url)` | **예** | 높음 | **예** |
| `src/app/home/page.tsx` | 내부 `/api/safety-news` fetch | `cache: "no-store"` | **예**. 안전사고 카드 응답을 페이지 반환 전에 `await` | 높음. 매 요청 호출되고 운영에서는 절대 URL을 통한 HTTP 재호출 | **예**. 캐시 정책 및 호출 경계 검토 우선 |
| `src/app/api/safety-news/route.ts` | KOSHA 안전사고 API fetch | `cache: "no-store"` | **간접적으로 예**. `/home`이 내부 API 응답을 기다림 | 높음. 키가 설정된 경우 업종별 여러 외부 요청이 내부 API 시간에 포함 | **예**. 단, API 응답 계약과 tenant 선별 로직 보존 필요 |
| `src/lib/tenantLinks.ts` | `getTbmFormUrl()` | 해당 없음; 로컬 문자열 계산 | 아니오(네트워크 차단 없음) | 낮음 | 아니오 |
| `src/components/TbmFormAction.tsx` | 전달받은 링크 렌더링 | 해당 없음; 추가 fetch 없음 | 아니오(네트워크 차단 없음) | 낮음 | 아니오 |

캐시 정책 해석 시 유의할 점:

- `next: { revalidate: 7200 }`는 해당 기상청 리소스의 캐시 수명을 최대 7,200초로 지정한다.
- `cache: "no-store"`는 서버 fetch가 매 요청 원본 리소스를 다시 조회하도록 명시한다.
- Google RSS 호출은 캐시 옵션을 명시하지 않았다. 이 감사에서는 현재 코드에 명시된 정책이 없다는 사실만 확정하며, 실제 배포 런타임의 cache hit/miss는 후속 계측에서 확인한다.
- `/home`은 `force-dynamic`이므로 라우트 전체 정적화와 개별 fetch 캐시를 동일한 개념으로 취급하지 않는다. `force-dynamic` 제거는 이번 감사의 개선안이 아니다.

## 5. 병목 후보

### 5.1 `/api/safety-news`의 매 요청 재호출

- `/home`은 내부 `/api/safety-news`를 `cache: "no-store"`로 호출한다.
- Route Handler의 KOSHA fetch도 `cache: "no-store"`다.
- 따라서 KOSHA API key가 설정된 환경에서는 `/home → 내부 API → KOSHA`의 네트워크 체인이 매 요청 발생할 수 있다.
- 안전사고 사례는 tenant 확인이나 핵심 역할 홈보다 우선순위가 낮지만 현재 첫 렌더링 경로를 차단한다.

### 5.2 Google RSS 3개 직접 호출

- `/home` 서버 컴포넌트가 Google RSS 3종을 직접 fetch하고 XML을 파싱한다.
- 세 RSS는 서로 병렬이지만, RSS 묶음 전체가 날씨 완료 후 시작되고 내부 안전뉴스 호출보다 먼저 완료되어야 한다.
- 외부 RSS 한 곳의 지연은 `Promise.allSettled`의 완료 시점까지 뉴스 묶음을 지연시킬 수 있다.
- 명시적인 timeout도 없어 외부 응답 지연이 길어질 경우 첫 응답에 영향을 줄 수 있다. timeout 추가 자체는 동작 정책 변경이므로 별도 설계와 fallback 검증이 필요하다.

### 5.3 운영 환경의 내부 API 절대 URL 재호출

- 운영 환경에서 `/home`은 `https://safe-metrica.vercel.app/api/safety-news`라는 절대 URL로 같은 앱의 Route Handler를 재호출한다.
- 이는 함수 내부 직접 호출이 아니라 HTTP 경계를 한 번 더 통과하는 구조이므로 DNS/TLS/라우팅/서버리스 실행 등 추가 비용 후보가 된다.
- 배포 도메인이 코드에 고정되어 있어 preview/custom domain과 실제 호출 대상이 달라질 가능성도 별도 운영 위험이다.
- 이 항목은 코드 구조상 병목 **후보**이며 실제 추가 시간은 배포 환경에서 계측해야 한다.

### 5.4 부가 콘텐츠가 첫 화면을 차단

- 뉴스, 안전사고 사례, 날씨 기반 부가 브리핑이 모두 하나의 async page 함수 안에서 준비된다.
- 핵심 역할 홈과 tenant 기반 링크는 부가 콘텐츠 결과 없이도 구성할 수 있지만 현재는 모든 데이터 작업 후 페이지가 반환된다.
- 특히 뉴스·사례의 실패는 fallback으로 흡수되더라도 실패가 결정될 때까지의 대기시간은 첫 렌더링 경로에 남는다.

### 5.5 데이터 묶음 간 직렬 대기

- 날씨 2종끼리, RSS 3종끼리, KOSHA keyword끼리는 각각 병렬이다.
- 그러나 페이지 수준에서는 `getCompanyConfig()` 완료 후 날씨, 날씨 완료 후 RSS, RSS 완료 후 내부 API 순으로 실행된다.
- 따라서 독립적인 부가 호출의 지연이 직렬로 합산될 가능성이 있다.
- 단순히 모두 병렬화하면 tenant redirect 전에 불필요한 외부 호출이 발생하거나 tenant 정보가 필요한 요청을 잘못 시작할 수 있으므로, tenant 확인은 선행되어야 한다.

### 5.6 필수 tenant 설정 조회

- `getCompanyConfig()`는 tenant 접근 제어와 tenant별 링크/업종 문맥에 필수이며 Notion 조회를 포함한다.
- 외부 왕복이므로 계측 대상에는 포함해야 하지만 제거하거나 redirect보다 뒤로 미루면 안 된다.
- 후속 검토가 필요하다면 tenant 격리, 설정 최신성, 실패 동작을 보존하는 별도 설계가 선행되어야 한다.

## 6. 안전한 개선 후보

아래 항목은 구현 전 별도 PR 설계와 테스트가 필요하며, 이번 감사에서는 적용하지 않는다.

1. **tenant 확인과 핵심 역할 홈을 우선 렌더링**
   - `getCompanyConfig()`와 tenant redirect를 가장 먼저 유지한다.
   - redirect 통과 후 핵심 역할 홈·메뉴·TBM 진입점을 우선 표시하고 부가정보를 후순위 경계로 분리한다.

2. **뉴스/RSS 영역 분리**
   - Google RSS 로딩과 파싱을 별도 서버 컴포넌트 또는 별도 API/cache 계층으로 이동하는 설계를 검토한다.
   - 실패 시 빈 목록 또는 기존 fallback 표현을 유지하고 핵심 홈까지 지연시키지 않도록 한다.

3. **`/api/safety-news` 캐시 정책 재검토**
   - 사례 데이터의 허용 신선도, tenant별 결과 키, KOSHA 호출 제한을 먼저 정의한다.
   - 짧은 time-based revalidation 또는 tenant-aware cache key 가능성을 검토하되, 다른 tenant 결과가 섞이지 않도록 해야 한다.
   - Route Handler 응답 구조는 유지한다.

4. **안전사고 사례 카드 지연 로딩/fallback**
   - 첫 렌더링에서는 카드 영역의 안정적인 fallback 또는 skeleton을 표시하고, 사례 데이터는 후속 스트리밍/로딩 경계에서 표시하는 방안을 검토한다.
   - `safetyCaseEnabled`, tenant 업종 선별, KOSHA 실패 시 SAMPLE fallback 동작은 보존한다.

5. **부가 정보 loading/skeleton 처리**
   - 뉴스·사례·부가 브리핑별 loading UI를 작고 독립적인 경계로 설계한다.
   - 레이아웃 이동을 줄일 수 있도록 최종 카드 크기와 유사한 placeholder를 사용한다.

6. **날씨는 뉴스보다 낮은 우선순위로 유지**
   - 날씨 2종에는 이미 `next: { revalidate: 7200 }`가 적용되어 있다.
   - 따라서 첫 개선 대상은 매 요청 `no-store` 내부 API와 직접 RSS 호출로 두고, 날씨 분리는 후속 계측 결과에 따라 판단한다.

7. **계측을 먼저 추가하는 별도 검토**
   - tenant 설정, 날씨, RSS, 내부 API, Route Handler/KOSHA 구간별 server timing 또는 구조화 로그를 검토한다.
   - 실제 값이나 비밀정보를 로그에 포함하지 않고 duration, 성공/실패, fallback 여부만 기록해야 한다.

## 7. 위험한 변경 후보

다음 변경은 이번 감사 범위를 벗어나며 별도 검토 없이 진행하지 않는다.

- `getCompanyConfig()` 제거 금지
- tenant redirect 로직 변경 금지
- `/login?error=tenant_required` 및 `/contractor/mons` 분기 의미 변경 금지
- Notion API key, KOSHA key, 기상청 key 또는 다른 서버 비밀정보가 client로 노출되는 구조 금지
- `force-dynamic` 제거는 별도 검토 전 금지
- `/home` 메뉴 구조의 대규모 변경 금지
- `/api/safety-news`를 포함한 API 응답 구조 변경 금지
- DB/Notion/Supabase 저장·조회 계약 변경 금지
- 환경변수 추가/삭제 금지
- 실제 token/API key/환경변수 값 문서화 금지
- tenant별 cache key 분리 없이 안전사고 사례를 공용 캐시하는 변경 금지
- tenant 확인 전에 tenant 종속 호출을 시작하는 무조건적 병렬화 금지
- 정식 앱의 기능 약속, fallback 의미, tenant 격리 정책 변경 금지

## 8. 권장 다음 PR

권장 순서는 다음과 같다.

1. **`/home` 뉴스·안전사고 사례 영역을 첫 렌더링과 분리하는 설계**
   - 핵심 역할 홈 우선 렌더링 기준, 컴포넌트 경계, fallback, 오류 격리 방식을 정의한다.
2. **`/api/safety-news` 캐시 정책 검토**
   - 데이터 신선도와 tenant-aware cache key를 정의하고 운영 절대 URL 재호출 비용도 함께 검토한다.
3. **`/home` 부가 정보 loading/skeleton 처리**
   - 뉴스·사례·브리핑의 지연 상태를 독립적으로 표시하고 레이아웃 이동을 확인한다.
4. **역할 badge 중복 출력 cleanup**
   - 성능 변경과 분리하여 작은 UI cleanup PR로 처리한다.

첫 번째 PR의 최소 안전 조건은 다음과 같다.

- tenant 확인 및 두 redirect가 현재와 같은 순서로 먼저 실행될 것
- 핵심 역할 홈과 메뉴가 뉴스/RSS/KOSHA 실패와 무관하게 표시될 것
- API 응답 계약, tenant 선별, SAMPLE fallback을 변경하지 않을 것
- server-only secret이 client bundle 또는 client request에 포함되지 않을 것
- 개선 전후 첫 응답과 부가 콘텐츠 완료 시간을 동일 환경에서 비교할 것

## 9. 발견된 별도 cleanup 메모

아래 항목은 이번 PR에서 수정하지 않는다.

- 역할 카드 상단 badge 영역에서 역할명과 역할 관련 badge가 함께 표시되어 역할명이 중복되어 보일 수 있는 코드가 있다. 별도 UI cleanup PR에서 문구 의도와 중복 여부를 확인한다.
- `weatherActionPlan`의 `evidence` 목록에는 브리핑 조건 사이에서 중복·유사 문구가 보인다. 별도 cleanup PR에서 문구 정규화 여부를 검토한다.
- 두 항목 모두 데이터 로딩 감사와 기능적으로 무관하므로 이번 문서 PR에서는 코드 수정하지 않는다.

## 10. 검증 명령

문서 작성 후 아래 명령으로 변경 범위와 빌드 안정성을 확인한다.

```bash
git status --short --branch
git diff --stat
git diff --check
npm run build
```

검증 시 기대 사항:

- 변경 파일은 `docs/performance/HOME_DATA_LOADING_AUDIT.md`뿐이어야 한다.
- 소스 코드, API, DB/Notion/Supabase 로직, 환경변수 파일에는 diff가 없어야 한다.
- `git diff --check`에서 whitespace 오류가 없어야 한다.
- 기존 애플리케이션이 정상적으로 production build되어야 한다.
