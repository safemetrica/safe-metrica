# SafeMetrica Worker Confirmation UX & Ledger Standard v1

기준일: 2026-06-19  
범위: 근로자 QR 전자확인, 위험성평가 공유확인, 업종팩 확인항목, 모바일 자필 확인서명, 원장 저장 기준

## 1. 이 문서의 목적

SafeMetrica의 근로자 전자확인 흐름을 고객별 일회성 화면이 아니라 범용 Core + Industry Pack + Trial Shell 구조로 정리한다.

리치코리아 체험판에서 확인한 UX 피드백과 Claude UX 리뷰를 반영하되, SafeMetrica의 본체인 운영기록 원장 구조와 충돌하지 않도록 기준을 잠근다.

핵심 원칙:

- UI는 더 고급스럽고 현장 친화적으로 개선한다.
- 원장은 더 엄격하게 저장한다.
- 기존 SafeMetrica 기준은 절대화하지 않는다.
- 더 나은 기준이 명확하면 채택하되, 데이터 정합성·보안·배포 가능성·고객 노출 위험을 통과해야 한다.

## 2. 제품 판단 기준

새 기준이나 외부 제안이 들어오면 아래 기준으로 판단한다.

1. 현장 근로자가 더 쉽게 쓰는가
2. 30초 안에 이해하고 완료 가능한가
3. 공장 소음·장갑·카카오톡 인앱브라우저 같은 실제 환경을 고려하는가
4. 원장 데이터 정합성이 좋아지는가
5. 고객 노출 위험이 줄어드는가
6. 리치·현대·대도·버블몬 등 다른 고객에 재사용 가능한가
7. 법적 효력 보장, 인증 보장, 무재해 보장처럼 오해될 표현을 피하는가
8. 운영자가 확인·보고·Export 할 수 있는가

## 3. 채택할 UX 개선 기준

Claude UX 리뷰 중 아래 기준은 채택한다.

### 3.1 한 화면에서 묻는 결정 수 줄이기

근로자 화면은 기능을 많이 보여주는 화면이 아니라, 지금 해야 할 한 가지 행동을 쉽게 끝내는 화면이어야 한다.

Step마다 Primary CTA는 1개를 원칙으로 한다.

### 3.2 음성은 보조, 글 요약이 먼저

공장·물류·폐기물 현장은 소음이 크다. 음성 안내만 의존하면 안 된다.

Step 1에는 항상 읽을 수 있는 글 요약을 먼저 보여준다.

### 3.3 카카오톡 인앱브라우저 안내

현장 링크는 카카오톡으로 전달될 가능성이 높다. 카카오톡 인앱브라우저는 상·하단 UI로 서명창을 좁게 만들 수 있다.

권장 기준:

- Step 1 또는 진입부에 짧은 권장 브라우저 안내
- Step 2 서명창에도 한 번 더 안내
- 표현: Chrome, Safari, 갤럭시 기본브라우저 권장
- 표현 금지: 앱 설치 필수, 전자서명 보장

### 3.4 위험성평가 snapshot은 있을 때만 표시

위험성평가 공유내용은 빈 카드로 보여주지 않는다.

Version Lock 또는 worker-visible snapshot이 있을 때만 표시한다.

없으면 해당 카드 자체를 숨긴다.

### 3.5 의견 없음 / 의견 있음 분리

Step 2는 근로자가 먼저 경로를 고르게 하는 구조가 좋다.

추천:

- 의견 없음
- 의견 있음

큰 선택 카드 또는 세그먼트 컨트롤로 분리한다.

의견 없음이면 확인정보 + 자필 확인서명으로 바로 간다.  
의견 있음이면 의견 폼 + 선택적 익명 제출 + 확인정보 + 자필 확인서명으로 간다.

## 4. 유지해야 할 SafeMetrica 기준

UX는 개선하되 아래 기준은 유지한다.

1. 보호 route는 공개로 풀지 않는다.
2. 체험판에는 Owner Console, Supabase, API/내부 route, token, 실제 고객 DB 원본을 노출하지 않는다.
3. 위험성평가 공유확인은 Version Lock 또는 snapshot 없이는 표시하지 않는다.
4. 근로자가 본 내용과 체크한 내용은 나중에 원장에서 추적 가능해야 한다.
5. 모바일 자필 확인서명은 외부 전자서명 솔루션이 아니다.
6. 고객용 표현은 QR 기반 전자확인 기록, 모바일 자필 확인서명, 회사 내부 확인기록으로 제한한다.
7. 전자서명, 법적 효력 보장, 종이서명 완전 대체, HACCP 인증 보장, 무재해 보장 표현은 쓰지 않는다.
8. 고객별 page 복사 방식이 아니라 Core + Industry Pack + Trial Shell 구조로 간다.

## 5. 근로자 3단계 UX 표준

### Step 1. 안내·확인

목표: 근로자가 오늘 무엇을 확인해야 하는지 보고 체크한다.

권장 카드 순서:

1. BrowserGuardBanner
   - 카카오톡 인앱브라우저 감지 시 표시
   - Chrome, Safari, 갤럭시 기본브라우저 권장

2. DailySummaryCard
   - 오늘 확인 요약
   - 공장 소음 대비 글 안내
   - 날짜 또는 적용 기준 표시 가능

3. CompanyConfirmCard
   - 회사별 확인내용
   - 업종팩 문구
   - 접기/펼치기 가능

4. RiskAssessmentSnapshotCard
   - 조건부 표시
   - Version Lock 또는 snapshot 있을 때만 표시
   - 없으면 숨김

5. ConfirmCheckGroup
   - 근로자 체크
   - source별 check와 연결

추천 체크 문구:

- 오늘 확인 요약을 읽었습니다.
- 회사별 확인내용을 확인했습니다.
- 위험성평가 공유내용을 확인했습니다. 단, snapshot 있을 때만 노출.
- 작업 전 위생·안전 주의사항을 확인했습니다.
- 불편사항이 있으면 의견으로 남기겠습니다.

CTA:

- 비활성: 모두 확인 후 진행할 수 있어요.
- 활성: 다음 단계로.

### Step 2. 의견·서명

목표: 의견 유무를 분리하고, 필요한 경우 의견·사진·익명 선택을 받은 뒤 확인정보와 자필 확인서명을 남긴다.

권장 카드 순서:

1. FeedbackChoiceToggle
   - 의견 없음
   - 의견 있음

2. FeedbackForm
   - 의견 있음일 때만 표시
   - 의견 제목
   - 의견 유형
   - 위치/구역
   - 내용
   - 사진 첨부
   - 익명 의견 선택

3. ConfirmInfoCard
   - 이름 또는 별칭
   - 소속 또는 작업조
   - 확인번호: 휴대폰 뒷4자리 또는 사번

4. SignatureGuidance
   - 카카오톡 안에서 서명이 불편하면 Chrome, Safari, 갤럭시 기본브라우저로 열기

5. SignaturePad
   - 장갑/손가락 기준
   - 단일 터치 우선
   - 굵은 stroke
   - 넓은 캔버스
   - 가로모드 안내

CTA:

- 의견 없음: 확인서명하고 제출
- 의견 있음: 서명하고 제출

### Step 3. 완료

목표: 저장되었음을 명확히 알려주고 다음 행동을 단순화한다.

권장 문구:

- 확인기록이 저장되었습니다.
- 현장 담당자가 확인 후 필요한 경우 연락드립니다.

버튼:

- 처음 화면으로
- 다른 의견 남기기

주의:

- 법적 효력, 인증, 면책, 보장 표현 금지
- 저장 완료는 운영기록 저장을 의미하지 법적 확정을 의미하지 않는다.

## 6. Worker confirmation source model

근로자가 보는 모든 확인 대상은 source로 다룬다.

source_type 후보:

1. daily_summary
2. company_confirm_content
3. industry_checklist
4. risk_share_snapshot
5. feedback_prompt
6. browser_guidance

### 6.1 daily_summary

짧은 오늘 안내.

예시:

- 작업 전 손 위생과 위생복·장갑 착용 상태를 확인하세요.
- 포장실·세척구역 바닥 미끄럼과 이동 동선을 확인하세요.
- 불편사항이나 개선의견이 있으면 다음 단계에서 남겨 주세요.

업데이트 기준:

- 자주 바뀔 수 있음
- 운영자 또는 copy_pack에서 관리 가능
- 제출 시 snapshot 저장 필요

### 6.2 company_confirm_content

회사별 운영 확인내용.

예시:

- 리치코리아 식품공장 확인항목
- 현대호이스트 작업지시 확인항목
- 폐기물 현장 수거·후진·상차 확인항목

업데이트 기준:

- tenant_registry, industry_profile, template_pack, copy_pack 기준
- site별로 달라질 수 있음
- 제출 시 snapshot 저장 필요

### 6.3 industry_checklist

업종팩별 확인항목.

예시:

Food Factory Pack:

- 위생복/장갑 상태
- 손 세척 동선
- 포장실 바닥 미끄럼
- 세척도구 위치
- 원료보관실 이동 동선

Hoist Work Order Pack:

- 작업지시 확인
- 작업 전 사진
- 외주/일당 작업자 확인
- 작업 후 사진
- 고객 완료확인

### 6.4 risk_share_snapshot

위험성평가 공유확인.

표시 조건:

- share_status = locked
- customer_confirmed = true
- worker_visible = true
- version_lock_id exists

근로자에게 보일 수 있는 항목:

- 작업명
- 위험요인
- 사고유형
- 위험등급
- 확인할 안전조치

근로자에게 보이면 안 되는 항목:

- 관리자 메모
- 예산
- 내부 담당자
- 대표 확인
- Notion 원본 링크
- 내부 조치상태
- raw DB 필드

## 7. Worker check model

체크박스는 단순 label이 아니라 source와 연결되어야 한다.

v1에서는 raw_payload에 저장한다.  
v2에서는 별도 테이블로 정규화한다.

v1 raw_payload 후보:

- checked_source_ids
- checked_source_types
- checked_labels
- checked_snapshot_json
- checked_at

v2 테이블 후보:

worker_confirmation_checks

필드 후보:

- id
- submission_id
- tenant_code
- company_code
- site_id
- source_id
- source_type
- source_version
- checked_label
- checked_value
- checked_at
- checked_snapshot_json
- created_at

## 8. Submission ledger model

현재 중심 원장:

field_participation_submissions

v1에서는 여기에 raw_payload를 강화한다.

raw_payload에 반드시 남겨야 할 후보:

- source_route
- user_agent
- client_submission_id
- company_code
- tenant_code
- site_id
- service_mode
- enabled_modules
- confirmation_type
- identity_mode
- confirmation_sources
- checked_sources
- daily_summary_snapshot
- company_confirm_snapshot
- risk_share_snapshot, 있을 때만
- signature_metadata
- signature_snapshot_json
- feedback_payload
- evidence_payload

주의:

- raw_payload는 내부 원장용이다.
- 고객 Export에는 정리된 컬럼만 제공한다.
- 실제 고객 민감정보 원문을 문서/채팅/GitHub에 노출하지 않는다.

## 9. Handwritten signature model

고객용 표현:

- 모바일 자필 확인서명
- QR 기반 전자확인 기록
- 회사 내부 확인기록

금지 표현:

- 전자서명
- 법적 효력 보장
- 종이서명 완전 대체
- 외부 인증서 기반 서명
- 본인인증 완료

### 9.1 v1 기준

체험판 또는 초기 운영:

- signature_confirmation_method
- signature_confirmation_label
- signature_confirmation_snapshot_json
- handwritten_signature_signed_at
- source_route
- user_agent
- signature_data_url_present

v1은 raw_payload 중심으로 보강한다.

### 9.2 v2 기준

운영본:

- Supabase private Storage에 서명 이미지 저장
- DB에는 storage_path와 metadata 저장
- signed URL은 내부/관리자 검토용만 사용
- 고객 Export에 raw storage path 노출 금지

후보 테이블:

worker_signature_confirmations

필드 후보:

- id
- submission_id
- tenant_code
- company_code
- site_id
- signature_method
- signature_label
- storage_bucket
- storage_path
- mime_type
- size_bytes
- checksum_sha256
- signed_at
- signature_snapshot_json
- source_route
- user_agent
- created_at

## 10. Manager review model

근로자 제출은 관리자 확인 흐름으로 이어져야 한다.

v1:

- field_participation_submissions.status
- raw_payload.manager_review_candidate
- manager inbox query

v2 후보 테이블:

manager_review_records

필드 후보:

- id
- submission_id
- tenant_code
- company_code
- site_id
- review_status
- follow_up_required
- manager_note
- reviewed_by
- reviewed_at
- created_at

상태 후보:

- received
- reviewing
- follow_up_required
- completed
- dismissed

## 11. Weekly summary candidate model

주간 요약은 샘플 숫자가 아니라 원장 데이터에서 생성되어야 한다.

v1:

- query field_participation_submissions
- raw_payload 기반 summary candidate
- manager review before final delivery

v2 후보 테이블:

weekly_summary_candidates

필드 후보:

- id
- tenant_code
- company_code
- site_id
- week_start
- week_end
- total_confirmations
- total_feedback
- total_photo_feedback
- total_follow_up_required
- summary_candidate_json
- manager_review_status
- created_at

AI는 요약 후보를 만들 수 있지만 최종 판단자는 아니다.

## 12. Trial to production conversion

Trial shell은 운영본이 아니다.  
계약 후에는 검증된 흐름을 운영 원장 구조로 승격한다.

Trial shell:

- /trial/richi
- /trial/richi/manager
- /trial/richi/summary

Production tenant:

- tenant_registry
- enabled_modules
- industry_profile
- template_pack
- copy_pack
- theme_tokens
- report_template

전환 흐름:

1. trial
2. tenant active
3. enabled_modules 확정
4. site_id 확정
5. manager review 연결
6. signature storage v2 연결
7. weekly summary candidate 연결
8. export/report 연결

Trial-only 제거 대상:

- 샘플 숫자
- 샘플 관리자 화면
- 샘플 주간요약
- trial 문구
- fake demo records

## 13. 리치코리아 적용 기준

리치코리아는 Food Factory Pack의 첫 샘플이다.

현재 유지:

- 근로자 QR 전자확인
- 오늘 확인 요약
- 위생·안전 확인 체크
- 의견/불편사항 접수
- 필수 모바일 자필 확인서명
- 카카오톡/Chrome/Safari/갤럭시 기본브라우저 안내
- 관리자 샘플
- 주간요약 후보 샘플

다음 운영 전환 과제:

1. raw_payload 저장 상태 점검
2. daily_summary snapshot 저장
3. checked_sources 저장
4. signature metadata 저장 확인
5. signature image Storage v2
6. risk_share_snapshot 연결
7. 관리자 실제 접수함
8. 주간요약 후보 실제 데이터 연결

## 14. 구현 우선순위

v1 현실적 우선순위:

1. raw_payload 정합성 강화
2. 리치 체험판 제출 raw_payload 저장 상태 점검
3. signature metadata 저장 확인
4. manager inbox 실제 조회
5. weekly summary candidate 실제 조회

v2 정규화 우선순위:

1. worker_confirmation_sources
2. worker_confirmation_checks
3. worker_signature_confirmations
4. manager_review_records
5. weekly_summary_candidates

주의:

처음부터 테이블 5개를 모두 만들면 과설계 위험이 있다.  
v1은 raw_payload 정합성 강화, v2는 정규 원장 테이블 분리로 간다.

## 15. 향후 UI polish 기준

UI polish는 문서 기준을 통과한 뒤 진행한다.

채택할 방향:

- 한 화면의 결정 수 줄이기
- 의견 없음 / 의견 있음 분리
- 오늘 확인 요약과 위험성평가 snapshot 분리
- snapshot 없으면 위험성평가 카드 숨김
- 카톡 인앱브라우저 안내 2회 배치
- 서명 캔버스 넓게, 굵게, 흔들림 적게
- 모바일 버튼 크게
- 고객에게 보여줄 말은 짧게
- 원장에 저장할 데이터는 충분히

금지:

- 법적 효력 보장
- 인증 보장
- 종이서명 완전 대체
- 위험성평가 대행
- 안전관리대행
- AI 확정 판단

## 16. 다음 작업

문서 이후 작업 순서:

1. 리치 체험판 제출 raw_payload 저장 상태 점검
2. raw_payload에 confirmation_sources / checked_sources / signature_metadata 누락 여부 확인
3. Supabase 원장 테이블/필드 후보 설계
4. 서명 이미지 Storage 저장 v2 설계
5. 위험성평가 공유 snapshot 연결 설계
6. 관리자 실제 접수함/주간요약 후보 연결
