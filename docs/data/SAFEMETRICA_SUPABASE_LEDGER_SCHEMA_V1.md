# SafeMetrica Supabase Ledger Schema v1 설계 기준

- 기준일: 2026-06-08
- 문서 성격: 통합 안전운영 원장 설계 기준
- 구현 범위: 문서화만 포함하며 데이터베이스 변경은 포함하지 않음

## 1. 목적

이 문서는 Supabase를 단순한 shadow-write 저장소가 아니라 업체별 안전운영 원장으로 확장하기 위한 Ledger Schema v1 기준을 정의한다.

원장 관점에서 다음 운영기록을 하나의 흐름으로 연결하는 것이 목적이다.

- 근로자의 위험성평가 공유확인
- 근로자와 현장의 위험제보, 아차사고 및 개선제안
- TBM 작성, 음성작성 및 사진첨부
- 관리자의 조치 생성, 상태 변경 및 조치 증빙
- 대표의 운영 확인
- 월간보고서 후보 선정
- 업체별·기간별 증빙 export

이 문서는 향후 `operational_ledger` 테이블 또는 통합 export view를 설계하기 위한 기준이다. 실제 테이블, view, index, RLS 정책 또는 SQL migration은 생성하지 않는다.

## 2. 현재 전제

Ledger Schema v1은 현재 분리된 원장을 없애거나 원본 테이블을 즉시 대체하는 설계가 아니다. 기존 원본을 보존하면서 조회·집계 계층에서 일관된 이벤트 형식으로 연결하는 것을 우선한다.

| 현재 구조 | 원장 역할 |
| --- | --- |
| `companies`, `sites`, `risk_instances`, `actions`, `evidence_items` | 위험성평가·개선조치·증빙 구조의 기준 |
| `tbm_voice_submissions` | TBM 음성작성 및 사진첨부 원장 |
| `field_participation_submissions` | 근로자 공유확인, 위험제보, 아차사고 및 개선제안 원장 |
| Notion | 당분간 유지하는 운영허브 및 보조 링크 |
| Supabase | 장기 원장 및 export의 기준 |

Supabase row와 Notion page는 자동으로 같은 생명주기를 갖는다고 가정하지 않는다. Notion 식별자와 URL은 원장 이벤트의 보조 연결값으로 유지할 수 있지만, 통합 원장과 export의 기준 데이터는 Supabase로 본다.

## 3. `company_key` 정규화 기준

현재 제출 원장별 업체 식별 필드가 다르므로 ledger와 export 계층에서 `company_key`로 정규화한다.

| 원본 테이블 | 원본 업체 식별 필드 | 정규화 결과 |
| --- | --- | --- |
| `field_participation_submissions` | `tenant_code` | `company_key` |
| `tbm_voice_submissions` | `company_code` | `company_key` |

`company_id`가 있는 테이블은 `companies.id`를 기준으로 연결한다. `company_key`와 `company_id`를 함께 제공할 수 있는 경우에는 다음 역할을 구분한다.

- `company_id`: `companies.id`를 참조하는 내부 관계 키
- `company_key`: 고객사 구분, 기간별 export, 월간보고서 집계 및 외부 요청 필터의 정규화 키

정규화 시에는 원본 코드를 임의로 변환하지 않고, `companies` 기준정보와의 매핑 가능 여부를 검증해야 한다. 매핑되지 않는 값은 다른 업체로 추정 결합하지 않으며, 별도의 데이터 품질 점검 대상으로 분류한다.

## 4. `operational_ledger` 개념

향후 생성 후보인 `operational_ledger`는 분리된 원본 테이블의 운영 이벤트를 공통 형식으로 조회하기 위한 테이블 또는 read-only view다. v1에서는 물리 구조를 확정하지 않으며, 원본 레코드의 출처와 원본 식별자를 반드시 보존하는 것을 원칙으로 한다.

### 4.1 컬럼 후보

| 컬럼 | 설계 용도 |
| --- | --- |
| `id` | 통합 원장 이벤트 식별자 |
| `company_key` | 업체 구분 및 export 정규화 키 |
| `company_id` | `companies.id` 연결값 |
| `site_id` | `sites.id` 연결값 |
| `source_table` | 원본 테이블명 |
| `source_id` | 원본 row 식별자 |
| `event_type` | 정규화된 이벤트 유형 |
| `actor_role` | 근로자, 관리자, 대표 등 행위자 역할 |
| `actor_name` | 표시 가능한 범위의 행위자명 |
| `submitted_anonymously` | 익명 제출 여부 |
| `title` | 이벤트 제목 또는 요약 제목 |
| `content` | 제출·조치·확인 내용 |
| `location` | 현장, 작업구역 또는 위험 위치 |
| `status` | 이벤트 또는 처리 상태 |
| `event_date` | 실제 업무 이벤트 기준일 |
| `created_at` | 원본 기록 생성시각 |
| `updated_at` | 원본 기록 최종 수정시각 |
| `notion_page_id` | 연결된 Notion page 식별자 |
| `notion_url` | 연결된 Notion page URL |
| `evidence_count` | 연결된 증빙 개수 |
| `has_files` | 파일 또는 증빙 존재 여부 |
| `monthly_report_candidate` | 월간보고서 후보 여부 |
| `client_submission_id` | 클라이언트 제출 식별자 |
| `raw_payload` | 원본 payload 보존값 |

### 4.2 공통 처리 원칙

- `source_table`과 `source_id`의 조합으로 원본 추적이 가능해야 한다.
- 원본에 값이 없는 컬럼은 임의 생성하지 않고 `null` 또는 명시된 기본 규칙으로 처리한다.
- `event_date`와 `created_at`은 의미를 분리한다. 기간 필터에 사용할 기준 timestamp와 시간대는 export view/API 설계에서 확정한다.
- `evidence_count`와 `has_files`는 같은 의미가 아니다. 파일 외 증빙을 포함할 수 있으므로 산정 규칙을 별도로 정의한다.
- `raw_payload`는 원본 추적에 필요한 범위에서만 다루며, 개인정보·민감정보·파일 접근정보가 포함될 가능성을 고려해 조회 및 export 권한을 제한한다.
- 원본 테이블 간 필드명이 다르더라도 ledger 결과의 필드 의미는 일관돼야 한다.

## 5. `event_type` 기준

Ledger Schema v1의 이벤트 유형은 다음과 같이 정의한다.

| `event_type` | 의미 |
| --- | --- |
| `risk_shared_confirmed` | 위험성평가 공유확인 |
| `worker_report_submitted` | 근로자 위험제보 제출 |
| `near_miss_submitted` | 아차사고 제출 |
| `improvement_suggested` | 개선제안 제출 |
| `tbm_created` | TBM 작성 |
| `tbm_voice_created` | 음성 TBM 작성 |
| `tbm_evidence_attached` | TBM 사진첨부 |
| `action_created` | 관리자 등의 조치 생성 |
| `action_status_changed` | 조치상태 변경 |
| `action_evidence_attached` | 조치사진 첨부 |
| `ceo_reviewed` | 대표 확인 |
| `monthly_report_candidate_marked` | 월간보고서 후보 지정 |

하나의 원본 row에서 복수의 운영 사건이 발생할 수 있다. 예를 들어 음성 TBM 생성과 사진첨부가 하나의 제출에 함께 저장되더라도, 통합 원장에서는 `tbm_voice_created`와 `tbm_evidence_attached`를 구분할 수 있어야 한다. 실제 분리 방식은 테이블 또는 view 설계 단계에서 원본 데이터의 생성·수정 시점과 추적 가능성을 검토해 정한다.

이벤트 유형은 현재 상태값을 다른 이름으로 바꾸는 용도가 아니라, “무슨 일이 발생했는가”를 표현하는 기준이다. 처리 결과는 `status`, 행위자는 `actor_role`, 원본은 `source_table`과 `source_id`로 각각 분리한다.

## 6. 증빙 연결 기준

현재 증빙 출처는 다음과 같이 구분한다.

| 증빙 출처 | 기준 필드 또는 구조 | 역할 |
| --- | --- | --- |
| 현장참여 | `field_participation_submissions.file_urls` | 공유확인, 위험제보, 아차사고 및 개선제안 첨부파일 |
| TBM 음성작성 | `tbm_voice_submissions.uploaded_files` | TBM 사진첨부 |
| 위험성평가·개선조치 | `evidence_items` | 개선조치 및 위험성평가 관련 증빙 |

업체별·기간별 export에서는 위 출처를 `evidence_manifest`로 통합하는 방식을 검토한다. 원본 파일을 복제한다는 의미가 아니라, 파일과 관련 이벤트를 일관된 목록으로 조회하기 위한 manifest다.

### 6.1 `evidence_manifest` 후보 컬럼

| 컬럼 | 설계 용도 |
| --- | --- |
| `evidence_id` | 통합 증빙 식별자 또는 원본 증빙 식별자 |
| `company_key` | 업체 구분 키 |
| `source_table` | 증빙 원본 테이블 |
| `source_id` | 증빙이 연결된 원본 row 식별자 |
| `event_type` | 증빙과 연결된 정규화 이벤트 유형 |
| `file_url` | 파일 위치 |
| `file_type` | MIME type, 확장자 등 파일 형식 |
| `evidence_type` | TBM, 조치 전·후, 현장사진 등 증빙 분류 |
| `created_at` | 증빙 생성 또는 첨부시각 |
| `notion_url` | 관련 Notion 보조 링크 |
| `export_included` | 해당 export 패키지 포함 여부 |

### 6.2 증빙 처리 원칙

- `file_urls`와 `uploaded_files`가 배열 또는 구조화 데이터라면 파일 1개당 manifest row 1개로 펼치는 방식을 우선 검토한다.
- `evidence_items`는 관련 위험요인 또는 조치 식별자를 보존해 사건과 증빙의 관계를 추적할 수 있어야 한다.
- `export_included`는 파일의 존재 여부와 별개다. 권한, 접근 가능성, 보존정책 및 export 범위에 따라 결정한다.
- URL이 존재한다는 이유만으로 파일 접근이 항상 가능하거나 증빙이 충분하다고 판단하지 않는다.
- 파일 보존·삭제 정책과 Blob cleanup은 별도 설계 대상으로 둔다.

## 7. Action history 기준

현재 `actions.status`는 최종 상태 중심이므로 조치의 진행 과정을 재구성하기 어렵다. 향후에는 `action_history` 또는 `operational_ledger`의 `action_status_changed` 이벤트로 상태 변경 이력을 남겨야 한다.

### 7.1 상태 후보

- `접수`
- `검토중`
- `조치필요`
- `조치완료`
- `반려`

### 7.2 상태 변경 시 기록할 값

- 이전 상태
- 변경 상태
- 변경자
- 변경일시
- 조치메모
- 조치사진
- 관련 제보 ID
- 관련 위험요인 ID

상태 변경 이력은 최종 상태 row를 덮어쓰는 방식만으로 관리하지 않는다. 각 전이를 시간순으로 확인할 수 있어야 하며, 조치사진이 추가된 경우 `action_evidence_attached` 이벤트 또는 연결된 증빙 manifest로 추적할 수 있어야 한다.

`조치완료`는 운영 상태값이다. 해당 상태만으로 사진, 확인, 증빙 충분성 또는 별도 검토 절차까지 모두 완료됐다고 간주하지 않는다.

## 8. `monthly_report_candidate` 기준

모든 원장 기록을 월간보고서에 포함하지 않는다. `monthly_report_candidate`는 보고서 검토 대상을 좁히기 위한 후보 표시이며, 최종 보고서 포함 여부와 구분한다.

### 8.1 후보 선정 대상

- 위험제보
- 아차사고
- 개선제안
- `조치필요` 상태의 기록
- `조치완료` 상태의 기록
- 사진첨부가 있는 기록
- 미확인자 또는 미조치가 있는 기록
- TBM 주요 특이사항
- 대표 확인 필요 항목

### 8.2 판단 원칙

- 규칙 또는 AI가 월간보고서 후보를 제안할 수 있다.
- AI는 누락 가능성, 중요도 또는 후보 사유를 보조적으로 제시할 수 있다.
- 최종 후보 확정과 보고서 포함 판단은 관리자 또는 사업주가 수행한다.
- 후보 지정 행위는 `monthly_report_candidate_marked` 이벤트로 남기는 방식을 검토한다.
- 후보 여부와 함께 선정 주체, 선정일시 및 선정 사유를 추적할 수 있어야 한다.

## 9. Idempotency 기준

`#357`부터 `clientSubmissionId`를 `raw_payload`에 저장하기 시작했다. 클라이언트 측 중복 제출 방지만으로는 재시도, 네트워크 중복 요청 또는 서버의 반복 처리를 완전히 통제할 수 없으므로 향후 서버/DB 2차 방어를 위한 `idempotency_key` 기준이 필요하다.

### 9.1 후보 규칙

1. `company_key + clientSubmissionId`
2. `company_key + event_type + title + content_hash + created_minute`
3. `company_key + actor_role + source + clientSubmissionId`

여기서 `source`는 제출 경로 또는 원본 출처를 의미하며, 실제 스키마에서는 `source_table` 등 기존 출처 필드와의 관계를 정리해야 한다.

### 9.2 적용 원칙

- `clientSubmissionId`가 존재하면 업체 범위와 결합해 우선적인 멱등성 후보로 검토한다.
- `clientSubmissionId`가 없는 과거 기록과 비클라이언트 생성 이벤트에는 보조 규칙이 필요하다.
- 내용 기반 hash는 공백, 줄바꿈, 대소문자 및 개인정보 처리 방식에 따라 결과가 달라질 수 있으므로 정규화 규칙을 먼저 정의해야 한다.
- `created_minute` 기반 규칙은 정상적인 반복 제출을 오탐할 수 있으므로 자동 삭제 기준으로 바로 사용하지 않는다.
- 충돌 또는 중복 의심 기록은 원본을 임의 삭제하기보다 관찰·검토 가능한 상태로 남기는 방식을 우선한다.

v1에서는 설계 기준만 문서화한다. unique index, constraint, function 또는 migration은 생성하지 않는다.

## 10. Export view 기준

향후 업체별·기간별 안전운영 기록 export를 위해 다음 read-only view를 검토한다.

| 후보 view | 목적 |
| --- | --- |
| `v_operational_ledger` | 원본별 운영 이벤트 통합 조회 |
| `v_company_monthly_activity` | 업체별 월간 활동 및 보고서 후보 집계 |
| `v_evidence_manifest` | 첨부파일·증빙 목록 통합 조회 |
| `v_action_history` | 조치 생성 및 상태 전이 이력 조회 |
| `v_worker_participation_summary` | 근로자 공유확인·제보 등 참여현황 요약 |

### 10.1 Export 필터

- `company_key`
- `startDate`
- `endDate`
- `event_type`
- `status`
- `role`

### 10.2 조회 원칙

- `company_key` 필터는 필수로 적용해 업체 범위를 제한한다.
- `startDate`와 `endDate`의 포함 범위, 시간대 및 적용 timestamp는 구현 계약에서 명시한다.
- `role`은 원장 행위자 역할 필터와 export 실행 권한을 혼동하지 않는다.
- view는 읽기 전용 조회 계층으로 설계하고 원본 row 수정 경로로 사용하지 않는다.
- 전체 고객사 데이터의 무제한 export를 허용하지 않는다.
- 파일 URL, 행위자 정보 및 `raw_payload`의 포함 범위는 권한과 개인정보 기준을 별도로 적용한다.

## 11. RLS 및 권한 기준

원장과 export는 화면 노출 여부가 아니라 서버 측 인증, 역할 및 업체 범위를 기준으로 통제해야 한다.

- 외부 고객 또는 브라우저가 전체 원장에 직접 접근할 수 없어야 한다.
- Export는 서버 사이드에서 수행한다.
- service role은 client에 노출하지 않는다.
- `owner` 또는 관리자 권한 사용자만 export할 수 있어야 한다.
- 근로자 링크는 허용된 기록 제출만 가능해야 하며 원장 전체 조회 권한을 갖지 않는다.
- 대표 링크는 자기 회사의 요약 또는 보고서만 조회할 수 있어야 한다.
- 업체 간 데이터 격리는 `company_key` 문자열 필터만 신뢰하지 않고 인증 주체와 업체 관계를 함께 검증해야 한다.
- 서명 URL 또는 파일 URL을 export할 때는 만료, 재사용 및 외부 공유 가능성을 검토해야 한다.

이 문서는 권한 원칙을 정의할 뿐 실제 RLS 정책, Storage 정책, 인증 흐름 또는 service role 설정을 변경하지 않는다.

## 12. 안전ON 벤치마킹 반영

안전ON의 운영 관점을 SafeMetrica에 그대로 복제하거나 현재 제공 기능으로 확정하지 않는다. 다음 항목을 SafeMetrica의 제품 상태와 역할 구조에 맞춘 설계 검토 기준으로 반영한다.

- 근로자, 관리자 및 대표 역할 분리
- 업체별 링크 또는 QR 패키지
- 근로자 명단 및 승인 구조의 장기 검토
- TBM 전파 및 확인자 기록
- 위험제보를 누구나 작성할 수 있는 구조
- 조치 후 사진과 내용 기록
- 월간 안전운영 파일 export
- 공지사항 및 교육 메뉴의 장기 검토
- 위험성평가표는 출력지원 또는 운영지원으로 표현

제품·문서·영업 표현에서는 제도적 효력이나 외부기관의 인정 결과를 확정하지 않는다. AI는 운영기록의 후보 분류와 누락 점검을 지원할 수 있지만 최종 판단자는 아니다.

## 13. v1에서 하지 않는 것

Ledger Schema v1 문서 작업에는 다음 변경을 포함하지 않는다.

- SQL migration 생성
- 실제 `operational_ledger` 테이블 생성
- API 생성
- 화면 수정
- Supabase 정책 변경
- Notion 구조 변경
- 기존 데이터 정리
- Blob 파일 삭제
- 데이터베이스 row, view, function 또는 index 변경
- 환경변수 또는 실제 인증정보 변경

## 14. 권장 후속 작업

1. **1차 — Ledger Schema v1 문서 확정**: 통합 이벤트, 업체키, 증빙, 상태 이력 및 권한의 기준선을 확정한다.
2. **2차 — read-only export view 설계 문서**: view별 원본 매핑, timestamp, null 처리 및 필터 계약을 정의한다.
3. **3차 — export API v1 설계**: 서버 측 인증, 업체 범위 검증, 파일 패키징 및 감사기록을 설계한다.
4. **4차 — 관리자/Owner Export 버튼**: 권한이 확인된 사용자에게만 export 진입점을 제공한다.
5. **5차 — `action_history` 설계**: 상태 전이, 변경자, 조치메모 및 증빙 연결 구조를 확정한다.
6. **6차 — server-side idempotency 설계**: 멱등성 키 생성, 충돌 처리 및 과거 데이터 대응 방식을 정한다.
7. **7차 — RLS/권한 정책 점검**: 업체 격리, 역할별 조회 범위 및 Storage 접근정책을 검증한다.
8. **8차 — 월간보고서와 export 연결**: 후보 선정, 관리자 확정 및 보고서 근거 이벤트를 연결한다.

각 후속 작업은 별도 설계 검토와 승인 후 진행하며, 이 문서만으로 구현이 확정된 것으로 보지 않는다.

## 15. 금지 표현

Ledger, export, 월간보고서 및 관련 제품 설명에서는 다음 표현을 사용하지 않는다.

- 법적 면책
- 처벌 방지
- 과태료 방지
- 중대재해 면책
- 무재해 보장
- KOSHA 인정 보장
- 위험성평가 대행
- AI가 법적 판단 확정
- 법적 증빙 완료

실제 토큰, API Key, service role 값 또는 환경변수 값도 문서와 export 결과에 기록하지 않는다.

## 16. v1 고정 결론

Ledger Schema v1은 현재 분리된 위험성평가·조치·증빙, TBM 및 현장참여 원장을 업체별 안전운영 이벤트 관점으로 연결하기 위한 설계 기준이다.

Supabase를 장기 원장과 export의 기준으로 삼고, Notion은 운영허브 및 보조 링크로 유지한다. 향후 구현은 원본 추적성, `company_key` 기반 업체 격리, 역할별 권한, 상태 변경 이력, 증빙 manifest, 멱등성 및 관리자·사업주의 최종 판단 원칙을 함께 충족해야 한다.
