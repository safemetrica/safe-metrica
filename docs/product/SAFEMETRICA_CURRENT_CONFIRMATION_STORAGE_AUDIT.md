# SafeMetrica 현재 공유확인 저장 흐름 감사

- 작업명: Audit current confirmation event storage flow
- 점검일: 2026-06-07
- 범위: 근로자 참여판, 참여 제출 API, TBM 저장 흐름, Supabase shadow-write, 테넌트 설정
- 성격: 공유확인 원장 구현 전 현재 상태 문서화

## 0. 점검 범위와 전제

이 문서는 다음 구현을 정적 코드 기준으로 점검한다.

- `src/app/field/participation/page.tsx`
- `src/app/field/participation/FieldParticipationStepper.tsx`
- `src/app/field/participation/FieldParticipationFileInput.tsx`
- `src/app/field/participation/submitted/page.tsx`
- `src/app/field/participation/fieldWorkerRiskSummary.ts`
- `src/app/api/field/participation/submit/route.ts`
- `src/app/tbm/page.tsx`
- `src/app/tbm/[id]/page.tsx`
- `src/app/api/tbm/voice-submit/route.ts`
- `src/lib/supabaseServer.ts`
- `src/lib/company.ts`
- `src/lib/tbmEvidence.ts`, `src/lib/tbmShareTracking.ts` 등 관련 risk/TBM 라이브러리

실제 운영 데이터베이스 스키마와 저장 데이터는 조회하지 않았다. 따라서 Supabase 테이블 설명은 TypeScript 타입과 REST insert payload에서 확인되는 범위의 **코드 기준 추정**이다. 테이블 제약조건, 기본값, 인덱스, 트리거는 이 문서만으로 확정할 수 없다.

---

## 1. 현재 저장 흐름 요약

### 1.1 근로자 참여판 화면

`/field/participation?company=...`는 회사코드를 받아 4단계 스테퍼를 표시한다.

1. **Step 1 위험 확인**: 날씨 안내, 최대 3개의 핵심 위험 또는 TBM 확인 안내를 보여주고 `핵심 위험 확인 완료` 버튼으로 다음 단계로 이동한다.
2. **Step 2 위험성평가 공유·주지 확인**: 아래 세 체크를 모두 요구한다.
   - `riskCheck`: 오늘 작업의 주요 위험요인 확인
   - `riskAssessmentCheck`: 위험성평가 주요 내용 공유받음
   - `safetyMeasureCheck`: 필요한 안전조치와 주의사항 확인
3. **Step 3 의견 / 아차사고 제출**: 제목, 유형, 위치, 내용, 작성자, 익명 여부, 사진/파일을 입력한다. 의견이 없으면 유형은 `공유확인`, 제목은 `위험성평가 공유확인 완료`, 내용은 `오늘은 추가 의견 없음.`으로 구성된다.
4. **Step 4 완료**: 스테퍼 라벨은 존재하지만 동일 화면에서 Step 4 상태로 전환하지 않는다. Step 3 제출 뒤 `/field/participation/submitted`로 이동해 완료 또는 오류 문구를 표시한다.

중요한 현재 동작은 다음과 같다.

- Step 1 버튼 클릭 자체는 서버 요청이나 독립 저장을 발생시키지 않는다.
- Step 2의 세 체크도 체크 시점에는 브라우저 상태에만 존재한다.
- Step 1·2 정보는 Step 3의 최종 폼 제출 때 hidden field로 함께 전송된다.
- `initialStep`은 URL의 `intent=risk|share|report`에 따라 1·2·3으로 바로 시작할 수 있다. 따라서 `intent=report`로 Step 3에서 시작하면 세 확인값이 모두 false인 제출도 기술적으로 가능하다.
- 참여판 본 화면의 `riskSummary`는 현재 `hasDb: false`, 빈 `items`, 빈 `memo`로 고정 구성된다. 실제 위험 DB를 조회하는 `getFieldWorkerRiskSummary()` 도우미는 존재하지만 이 페이지에서 호출되지 않는다. 별도 위험요약 화면 링크는 존재하므로 화면 간 데이터 출처가 일치한다고 단정할 수 없다.

### 1.2 제출 API

최종 폼은 `POST /api/field/participation/submit`으로 전송된다.

처리 순서는 다음과 같다.

1. `companyCode` 또는 현재 테넌트 문맥으로 회사 설정을 조회한다.
2. 제출 유형을 `공유확인`, `위험제보`, `아차사고`, `개선제안`, `기타` 중 하나로 정규화한다.
3. 제출일, 위치, 작성자, 익명 여부, 세 확인값, 공유 위험요약, 첨부파일을 읽는다.
4. 첨부파일 크기를 검사하고, 서버 파일 저장 설정이 준비된 경우 Vercel Blob에 업로드한다.
5. 회사별 `fieldVoiceDbId`로 Notion 데이터 소스 속성을 조회한다.
6. 현재 데이터 소스에 존재하는 속성명만 골라 Notion 페이지를 생성한다.
7. Notion 생성이 성공한 경우에만, 회사별 shadow-write 설정이 활성화되어 있으면 Supabase insert를 시도한다.
8. Supabase insert 성공 여부와 무관하게 Notion 저장이 성공했다면 `status=saved`로 완료 화면에 이동한다.

### 1.3 Notion 저장 여부

**저장한다. 현재 참여 제출의 주 저장소는 Notion이다.**

회사 설정의 `fieldVoiceDbId`가 없으면 저장을 중단한다. Notion 페이지 생성이 실패해도 Supabase로 대체 저장하지 않고 오류 화면으로 이동한다.

Notion 속성은 대상 데이터 소스에 실제로 존재하는 이름에 따라 선택적으로 기록된다.

- 제목: `제보 제목`, `제보제목`, `제출 제목`, `의견 제목`, `제목` 중 존재 항목
- 제출구분: `제출구분`
- 레거시 유형: `제보유형`, `제보 유형`, `제출 유형`, `의견 유형` 중 존재 항목
- 날짜: `일시`, `등록일`, `날짜` 중 존재 항목
- 위치: `작업/위치`, `위치/구역`, `위치` 중 존재 항목
- 본문: `내용`
- 처리상태: `처리상태`, 값은 현재 항상 `접수`
- 확인 체크: `위험요인 확인`, `위험성평가 공유 확인`, `안전조치 확인`
- 제출자 및 익명: `제출자`, `익명`
- 첨부: `사진/파일`

해당 속성이 없는 경우 일부 정보는 본문 텍스트에 합쳐진다. 특히 세 확인값은 `[위험성평가 공유 확인]` 블록으로 항상 본문에 포함된다. 제출자/익명 속성이 없을 때도 `[제출 정보]` 블록으로 본문에 보강된다.

### 1.4 Supabase shadow-write 여부

**조건부로 저장한다.** 다음 두 조건을 모두 만족해야 한다.

- field participation shadow-write 전역 스위치가 활성화됨
- 현재 회사코드가 허용 회사 목록에 포함됨

저장 대상은 REST 경로상 `field_participation_submissions`이다. 다만 이 저장은 Notion 페이지 생성 성공 이후에만 실행된다. Supabase 저장 실패는 로그로만 남고 사용자 응답을 실패로 바꾸지 않는다. 따라서 현재 완료 화면의 `saved`는 Notion 저장 성공을 뜻하며, Supabase 동시 저장 성공까지 뜻하지는 않는다.

### 1.5 사진 및 `file_url` 처리 여부

- 참여판은 `evidenceFiles`라는 multipart 필드로 최대 5개 파일을 받는다.
- 서버는 파일당 4MB를 초과하면 제출을 중단한다.
- 서버 파일 저장 설정이 없으면 파일 URL 배열은 빈 값으로 남지만, 선택한 파일명과 크기는 Notion 본문 메모에 포함될 수 있다.
- 업로드 성공 파일은 Notion의 `사진/파일` 속성이 있을 때 외부 파일 URL로 연결된다.
- Supabase shadow record에는 단일 `file_url`이 아니라 **복수형 `file_urls: string[]`**가 전달된다.
- `raw_payload.uploadedFiles`에는 URL을 중복 저장하지 않고 파일명, 크기, MIME 유형을 넣는다. 실제 URL은 최상위 `file_urls`에 있다.

따라서 향후 원장 설계에서 `file_url` 단일 필드를 전제로 하면 현재 코드와 맞지 않는다. 0..N 증빙을 표현할 배열 또는 별도 evidence item 관계가 필요하다.

### 1.6 `raw_payload` 저장 여부

Supabase shadow-write가 실행되는 경우 `raw_payload`를 저장한다. 현재 포함 내용은 다음과 같다.

- `contractorName`
- `sharedRiskSummary`
- `riskCheck`
- `riskAssessmentCheck`
- `safetyMeasureCheck`
- `isAcknowledgementOnly`
- `selectedFileCount`
- `uploadedFileCount`
- `uploadedFiles`: 파일명, 크기, MIME 유형
- `notionProperties`: 실제로 구성한 Notion 속성명 목록

`raw_payload`에는 별도 `worker_id`, `confirmed_at`, `risk_id`, `tbm_id`, `participation_id`가 없다.

### 1.7 TBM 저장 흐름과 공유확인 관계

TBM 음성 제출 API는 참여 제출 API와 별도 흐름이다.

- 회사별 TBM DB에 Notion 페이지를 먼저 생성한다.
- 날짜, 시작/종료 시각, 실시자(현장총괄), 작업유형, 위험 태그, 주의사항, 특이사항, 조치 상태와 사진을 저장한다.
- 사진은 참석 서명, 현장, 작업, 조치 그룹으로 구분해 업로드할 수 있다.
- Notion 저장 성공 후 회사별 TBM shadow-write 설정이 활성화되면 `tbm_voice_submissions`에 snapshot을 저장한다.
- TBM shadow record는 `supervisor_name`, `date_value`, 파일 그룹, 위험 태그, 조치 상태 등을 포함한다.

다만 참석 서명사진은 **사진 단위의 참석 정황**이다. 코드에서 사진 속 개별 근로자를 식별하거나 각 근로자의 확인 상태·확인 시각을 구조화하지 않는다. `tbmShareTracking`은 Risk Item과 TBM의 연결 및 공유 텍스트를 기준으로 `shared`, `reviewNeeded`, `required` 등을 계산하지만, 개별 근로자 확인 원장은 아니다.

---

## 2. 근로자 4단계별 현재 저장 여부

| 단계 | 화면 표시 여부 | 사용자 동작 | 최종 제출 시 저장되는 값 | Notion 저장 | Supabase 저장 | 원장 필드 매핑 가능성 | 부족한 점 |
|---|---|---|---|---|---|---|---|
| Step 1 위험 확인 | 표시됨. 날씨, 핵심 위험 또는 TBM 확인 안내를 보여줌 | `핵심 위험 확인 완료` 버튼 클릭 | Step 1 전용 값 없음. 버튼 클릭 여부도 payload에 없음 | 별도 저장 없음 | 별도 저장 없음 | 현재 직접 매핑 불가 | 클릭 시각, 확인 대상 ID, 확인 상태, 근로자 식별자 없음. `completedSteps`는 브라우저 상태뿐임 |
| Step 2 위험성평가 공유·주지 확인 | 표시됨 | 세 체크 후 `공유 내용 확인` 클릭 | `riskCheck`, `riskAssessmentCheck`, `safetyMeasureCheck`; 최종 유형이 `공유확인`일 수 있음 | 세 checkbox 속성이 존재하면 개별 저장. 항상 본문에도 확인/미확인 텍스트 포함 | shadow-write 시 세 boolean을 `raw_payload`에 저장 | `confirmation_type` 후보와 `confirmation_status` 계산 재료로 일부 매핑 가능 | 체크별 시각 없음, 어떤 risk/TBM을 확인했는지 ID 없음, 한 제출 행에 세 의미가 혼합됨, 최종 제출 전에는 저장되지 않음 |
| Step 3 의견/아차사고 제출 | 표시됨, 선택 입력 | 제목·유형·위치·내용·작성자·익명·파일 입력 후 제출. 의견 없으면 `의견 없이 완료하기` | 제목, 유형, 내용, 위치, 제출자, 익명, 날짜, 처리상태, 파일 URL, 세 확인값 | 주 저장 발생 | Notion 성공 후 조건부 shadow-write | `participation_id`를 새로 발급한다면 참여 제출 원본으로 활용 가능. `submission_type`은 사건 유형 후보 | 공유확인과 의견 제출이 한 행에 결합됨. 작성자가 자유문자열이며 식별자 없음. 의견 제출 시에도 확인값이 같은 행에 섞임 |
| Step 4 완료 | 스테퍼 라벨은 있으나 동일 화면의 Step 4 본문은 없음. 별도 submitted 페이지 표시 | 제출 후 리다이렉트 결과 확인 | 추가 저장 없음 | 추가 저장 없음 | 추가 저장 없음 | 저장 결과 UI로만 사용 가능 | 완료 시각을 별도 기록하지 않음. `saved`가 Supabase 성공까지 보장하지 않음. 사용자에게 원장 이벤트 ID를 제공하지 않음 |

### 단계별 핵심 판단

- 현재 저장 단위는 “단계별 이벤트”가 아니라 **최종 참여 제출 1건**이다.
- Step 1은 저장 근거가 없다.
- Step 2는 최종 제출에 포함된 세 boolean으로만 남는다.
- Step 3에서 의견이 없으면 동일 제출을 `공유확인`으로 분류한다.
- Step 4는 저장 이벤트가 아니라 결과 화면이다.

---

## 3. `field_participation_submissions` shadow-write 기준 필드 추정

아래 표는 `FieldParticipationSubmissionShadowRecord` 타입과 insert payload 기준이다.

| 요청 필드 | 현재 코드상 필드/값 | 판단 |
|---|---|---|
| `tenant_code` | `company.code` | 있음. 회사코드가 테넌트 식별 역할을 함 |
| `company_name` | `company.name` | 있음 |
| `submission_type` | 정규화된 `공유확인`, `위험제보`, `아차사고`, `개선제안`, `기타` | 있음 |
| `legacy_type` | 레거시 표기 변환값. 예: `위험 제보`, `개선 제안` | 있음 |
| `title` | 사용자 제목 또는 공유확인 기본 제목 | 있음 |
| `content` | 확인 블록, 제출 정보, 파일 메모, 처리 기준이 합쳐진 최종 본문 | 있음 |
| `location` | 사용자 입력 위치/구역 | 있음 |
| `submitter` | 익명이면 `익명`, 아니면 입력값 또는 `미입력` | 있음. 표준화되지 않은 표시 문자열 |
| `anonymous` | boolean | 있음 |
| `reported_date` | 폼 날짜 또는 KST 기준 당일 | 있음. 업무일/발생일/확인일 의미가 혼재될 수 있음 |
| `status` | 현재 항상 `접수` | 있음. 확인 상태가 아니라 처리 상태 |
| `notion_page_id` | 생성된 Notion 페이지 ID | 있음 |
| `notion_url` | 생성된 Notion 페이지 URL | 있음 |
| `file_url` | 해당 단수 필드는 코드에 없음 | 없음. 실제 코드는 `file_urls: string[]` 사용 |
| `file_urls` | 업로드 성공 파일 URL 배열 | 있음 |
| `raw_payload` | 확인값, 공유요약, 파일 메타, Notion 속성명 등 | 있음 |
| `created_at` | insert payload와 TypeScript 타입에 없음 | 코드에서 직접 설정하지 않음. DB 기본값 존재 여부는 별도 확인 필요 |

### `raw_payload`로만 남는 정보

세 확인값과 `isAcknowledgementOnly`는 정규 컬럼이 아니라 `raw_payload` 내부에 있다. 쿼리·집계·관계 연결이 필요한 원장 핵심값을 계속 JSON 내부에만 두면 다음 문제가 생길 수 있다.

- 확인 유형별 집계가 복잡해짐
- boolean 세 개와 원장 상태의 의미 변환 규칙이 분산됨
- risk/TBM 관계 ID를 추가할 때 참조 무결성을 표현하기 어려움
- 향후 필드명이 바뀌면 과거 payload 해석 규칙이 필요함

---

## 4. 공유확인 원장과의 Gap

| 원장 후보 필드 | 현재 대응 상태 | Gap |
|---|---|---|
| `worker_id` | 없음 | 작성자 문자열과 별개인 안정적 근로자 식별자 필요. 익명 제출 정책과 함께 정의해야 함 |
| `worker_name` 표준화 | `submitter` 자유문자열만 있음 | 이름/소속 혼합 가능, `미입력`·`익명`도 같은 컬럼에 들어감. 표시명과 식별 정보를 분리할 필요 |
| `work_date` | `reported_date` 존재 | 발생일·확인일·업무일 중 의미가 확정되지 않음. KST 당일 기본값이지만 사용자가 명시한 업무일 정책은 없음 |
| `confirmation_type` | `submission_type=공유확인` 및 세 boolean으로 일부 추정 | 위험 확인, 위험성평가 공유, 안전조치 확인, TBM 참석 확인을 구분하는 명시 필드 없음 |
| `confirmation_status` | 없음 | 세 boolean과 제출 성공을 조합해 추정할 수 있으나 원장 상태값으로 저장되지 않음 |
| `confirmed_at` | 없음 | 체크 시각, Step 2 완료 시각, 서버 수신 시각이 저장되지 않음. `created_at`도 코드 payload에는 없음 |
| `risk_id` | 없음 | 참여판 본 화면의 위험요약도 현재 빈 값이며, 확인 대상 위험 항목 ID를 payload에 싣지 않음 |
| `tbm_id` | 없음 | 참여 제출과 TBM 페이지/레코드 간 관계가 없음. TBM 참석 서명사진도 개인별 연결이 아님 |
| `participation_id` | 없음 | Supabase 행 ID가 DB에서 생성될 가능성은 있으나 코드가 반환·연결하지 않음. Notion page ID를 대체 식별자로 쓸지는 별도 결정 필요 |
| `manager_review_status` | 없음 | 현재 `status=접수`만 있으며 검토 상태 모델이 분리되지 않음 |
| `manager_action_status` | 참여 제출에는 없음 | TBM에는 조치 상태 개념이 있으나 참여 제출 원장과 공통 관계가 없음 |
| `evidence_item_ids` | 없음 | 파일 URL 배열과 파일 메타만 있음. 별도 Evidence item 식별자 또는 관계가 없음 |

### 추가 구조적 Gap

1. **Notion 선행 의존성**
   참여 원장 후보인 Supabase 저장은 Notion 성공 뒤에만 실행된다. Notion 장애 시 확인 이벤트 자체도 Supabase에 남지 않는다.

2. **shadow-write 실패의 사용자 비가시성**
   Supabase 실패가 최종 응답을 바꾸지 않으므로 화면만으로 양쪽 저장 일치 여부를 알 수 없다.

3. **하나의 제출에 여러 의미 혼합**
   공유확인 세 항목, 위험/아차사고/개선 의견, 첨부파일, 처리 상태가 한 레코드에 결합된다.

4. **대상 객체 연결 부재**
   확인한 위험 항목, TBM, 참여 제보, 증빙 항목의 식별자가 없다.

5. **개별 근로자 확인과 TBM 증빙의 차이**
   TBM 참석 서명사진은 그룹 증빙으로 활용할 수 있으나 개별 worker confirmation으로 바로 변환할 구조는 아니다.

6. **현재 위험요약 전달 공백**
   위험요약 조회 도우미는 있지만 참여판 본 페이지가 이를 사용하지 않아 `sharedRiskSummary`가 현재 빈 문자열로 제출된다. 이 상태에서는 어떤 위험 내용을 공유했는지 본문과 `raw_payload`만으로 복원할 수 없다.

7. **진입 경로에 따른 확인값 누락 가능성**
   `intent=report`는 Step 3부터 시작할 수 있어 Step 2 세 체크 없이 의견 제출이 가능하다. API도 일반 의견 제출에 세 체크를 필수 검증하지 않는다.

---

## 5. 구현 전 결론

### 5.1 지금 저장 구조로 가능한 것

- 회사별 현장 참여 제출을 Notion에 저장
- 공유확인, 위험제보, 아차사고, 개선제안 유형 구분
- 최종 제출 시 세 확인 boolean 보존
- 작성자 표시 문자열, 익명 여부, 위치, 제출일, 내용 보존
- 첨부파일 URL 및 기본 파일 메타 보존
- 허용된 회사에 한해 Notion 성공 건을 Supabase에 shadow-write
- Notion page ID/URL로 원본 저장 레코드 추적
- `raw_payload`를 이용한 제한적 사후 분석

### 5.2 추가 필드가 필요한 것

최소한 다음 필드는 JSON 내부가 아니라 조회 가능한 원장 필드로 검토할 필요가 있다.

- `worker_id`
- `worker_name`
- `work_date`
- `confirmation_type`
- `confirmation_status`
- `confirmed_at`
- `risk_id`
- `tbm_id`
- `participation_id`
- `manager_review_status`
- `manager_action_status`
- `evidence_item_ids`

또한 원본 추적을 위해 `source_system`, `source_record_id`, `source_step`, `submission_id` 같은 식별 필드도 후보가 될 수 있다.

### 5.3 지금 바로 구현하면 위험한 것

- `submitter`를 곧바로 `worker_name` 또는 개인 식별자로 간주하는 것
- `reported_date`를 별도 정책 없이 `work_date`로 확정하는 것
- 한 건의 `공유확인` 제출을 Step 1·2의 모든 확인 이벤트가 각각 존재한 것으로 해석하는 것
- `created_at`을 `confirmed_at`으로 간주하는 것
- TBM 참석 서명사진 한 장을 사진 속 모든 근로자의 개별 확인 레코드로 변환하는 것
- Notion 저장 성공 화면을 Supabase 원장 저장 성공으로 간주하는 것
- `file_urls`를 안정적인 증빙 식별자로 사용하는 것
- `raw_payload` 안의 boolean만으로 장기 원장 모델을 고정하는 것
- 현재 비어 있는 `sharedRiskSummary`를 근거로 위험 항목 공유 내용을 복원할 수 있다고 보는 것

### 5.4 다음 개발 우선순위

1. 확인 이벤트의 의미와 식별 단위를 먼저 정의한다.
2. `worker_id`/`worker_name`/익명 정책과 `work_date` 기준을 확정한다.
3. Step 1과 Step 2를 각각 저장할지, Step 2 완료 시 하나의 확인 이벤트로 저장할지 결정한다.
4. `risk_id`, `tbm_id`, `participation_id` 관계를 payload에 전달할 수 있도록 화면 데이터 출처를 정리한다.
5. Notion 주 저장과 Supabase 원장 저장의 성공 기준 및 재처리 정책을 정한다.
6. 관리자 검토/조치 상태와 evidence item 관계를 설계한다.
7. 그 다음 기존 shadow-write를 원장 dual-write 또는 별도 이벤트 저장으로 확장한다.

---

## 6. 다음 개발 제안

### 6.1 field participation submit payload에 `confirmation_type` 후보 추가

초기 후보는 다음처럼 제한적으로 정의할 수 있다.

- `risk_review`: Step 1 핵심 위험 확인
- `risk_assessment_shared`: 위험성평가 공유 확인
- `safety_measure_review`: 안전조치 확인
- `tbm_attendance`: TBM 참석/공유 확인
- `participation_no_opinion`: 추가 의견 없는 참여 완료

현재 세 checkbox를 그대로 장기 타입으로 쓰기보다, 원장 이벤트의 의미를 나타내는 열거형과 버전 정책을 두는 편이 명확하다.

### 6.2 Step 1/2 확인 이벤트 저장 분리 검토

두 가지 안을 비교해야 한다.

- **분리 저장**: Step 1 버튼과 Step 2 완료를 각각 이벤트로 저장
  - 장점: 단계별 시각과 중도 이탈을 알 수 있음
  - 유의점: 중복 클릭, 재시도, 네트워크 오류에 대한 멱등성 키 필요
- **Step 2 완료 시 통합 저장**: 세 확인값을 하나의 확인 이벤트로 저장
  - 장점: 구현과 집계가 단순함
  - 유의점: Step 1 독립 확인 근거와 체크별 시각은 남지 않음

어느 안이든 Step 3 의견 제출 레코드와 확인 이벤트 레코드는 논리적으로 분리하는 편이 분석과 상태 관리에 유리하다.

### 6.3 `worker_name`/`submitter` 표준화

- `worker_id`: 내부 안정 식별자
- `worker_name`: 표시 이름
- `worker_affiliation`: 소속
- `submitter_display`: 기존 호환 표시 문자열
- `anonymous`: 익명 여부

익명 제출은 원장 목적과 개인정보 최소화 원칙을 함께 고려해 별도 정책으로 정의해야 한다. 단순히 `submitter="익명"`으로 덮어쓰면 내부 연결 필요성과 표시 정책을 분리하기 어렵다.

### 6.4 `work_date` 기준 확정

현재 `reported_date`는 발생/확인일 UI 의미와 KST 당일 기본값을 함께 가진다. 원장에서는 다음을 구분할지 결정해야 한다.

- `work_date`: 실제 작업 기준일
- `reported_at`: 제출 서버 수신 시각
- `confirmed_at`: 확인 행동 완료 시각
- `incident_date`: 위험/아차사고 발생일

최소한 확인 이벤트와 사건 제보가 같은 날짜 필드를 다른 의미로 쓰지 않도록 해야 한다.

### 6.5 manager review/action status 연계

현재 참여 제출의 `status=접수`와 TBM의 조치 상태는 서로 다른 모델이다. 다음처럼 분리 검토한다.

- `manager_review_status`: `pending`, `reviewed`, `needs_follow_up`
- `manager_action_status`: `not_required`, `planned`, `in_progress`, `completed`, `needs_review`

상태 변경 주체와 변경 시각, 원본 레코드 관계도 함께 남겨야 한다.

### 6.6 Evidence Export와 연결할 `evidence_item_ids` 설계

파일 URL 자체 대신 증빙 항목 레코드를 만들고 원장에서 ID 배열 또는 관계 테이블로 연결하는 방식을 검토한다.

증빙 항목 후보 필드:

- evidence item ID
- 원본 파일 URL 또는 저장 객체 키
- 파일명, MIME 유형, 크기
- evidence category: participation, TBM signature, site, work, action 등
- source record ID
- captured/uploaded timestamp
- uploader 또는 제출 주체
- 무결성 확인에 필요한 메타데이터

이 구조가 정해져야 참여판 파일과 TBM의 참석 서명·현장·작업·조치 사진을 Evidence Export에서 일관되게 참조할 수 있다.

---

## 7. 최종 요약

현재 구현은 “근로자가 최종 제출한 참여/의견 1건”을 Notion에 저장하고, 일부 회사에 한해 같은 결과를 Supabase에 shadow-write하는 구조다. Step 1과 Step 2는 독립 이벤트가 아니며 Step 3 최종 제출에 포함된다. TBM은 별도 Notion 및 shadow-write 흐름과 사진 기반 참석 근거를 갖지만, 개별 근로자 공유확인 레코드와 연결되어 있지 않다.

따라서 공유확인 원장 구현 전에는 **근로자 식별, 업무일과 확인 시각, 확인 유형과 상태, risk/TBM/participation 관계, 관리자 상태, 증빙 ID**를 먼저 정의해야 한다. 그 정의 없이 현재 제출 행을 그대로 원장으로 해석하면 단계별 확인 의미와 대상 객체 관계가 불명확해질 가능성이 크다.
