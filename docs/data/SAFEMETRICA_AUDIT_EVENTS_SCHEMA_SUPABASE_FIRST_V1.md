# SafeMetrica Audit Events Schema for Supabase-first Operations v1

* 기준일: 2026-06-13
* 문서 성격: Supabase-first 운영 감사이력 audit_events 논리 schema 기준
* 적용 범위: 신규 고객, Risk Share Pack, Full SafeMetrica, 링크 관리, 제출 기록, 관리자 검토, 사진·증빙, Export, 월간보고서
* 주의: 본 문서는 법적 판단, 면책, 처벌 방지, 무재해 보장 문서가 아니다.

## 1. 목적

이 문서는 SafeMetrica Supabase-first 운영에서 `audit_events`가 어떤 이력을 남겨야 하는지 정의한다.

SafeMetrica는 위험성평가를 대신 수행하거나 법적 판단을 확정하는 시스템이 아니다. SafeMetrica의 감사이력은 다음을 확인하기 위한 운영기록이다.

* 링크가 언제 생성되었는지
* 링크가 언제 폐기되었는지
* 링크가 언제 접근되었는지
* 근로자 또는 근로자대표가 언제 제출했는지
* 관리자가 언제 검토상태를 변경했는지
* 조치메모가 언제 변경되었는지
* 사진·증빙이 언제 업로드되었는지
* 고객용 Export가 언제 생성되었는지
* 월간보고서가 언제 생성되었는지

감사이력은 운영 흐름 확인 자료이며, 법적 책임 이전, 조치완료 확정, 면책 확정을 의미하지 않는다.

## 2. 기본 원칙

1. audit_events는 Supabase-first 신규 고객 운영의 공통 이력 원장이다.
2. 고객사 단위로 반드시 company_id 또는 company_code와 연결한다.
3. 현장 단위 이력은 가능하면 site_id와 연결한다.
4. source_type과 source_id를 통해 원본 기록과 연결한다.
5. 고객용 Export에는 audit_events 원본 전체를 직접 제공하지 않는다.
6. 고객에게 필요한 경우 정제된 운영 로그 요약만 제공한다.
7. service role, token, raw payload, 내부 API 경로는 고객에게 노출하지 않는다.
8. audit_events는 삭제보다 보존을 우선한다.
9. 테스트 데이터는 별도 기준에 따라 삭제 가능하다.

## 3. audit_events 논리 schema

`audit_events`는 운영 이력을 남기는 공통 테이블이다.

### 3.1 주요 컬럼 후보

| 컬럼              | 타입 후보       | 필수 | 설명                 |
| --------------- | ----------- | -: | ------------------ |
| event_id        | uuid        |  예 | 감사이력 내부 식별자        |
| company_id      | uuid        |  예 | companies 연결       |
| company_code    | text        |  예 | 조회·Export 편의용 회사코드 |
| site_id         | uuid        | 선택 | sites 연결           |
| actor_role      | text        |  예 | 행위자 역할             |
| actor_label     | text        | 선택 | 행위자 표시명            |
| actor_id        | text        | 선택 | 내부 행위자 식별자         |
| event_type      | text        |  예 | 발생 이벤트 유형          |
| source_type     | text        |  예 | 연결 원장 유형           |
| source_id       | text        | 선택 | 연결 원장 식별자          |
| event_summary   | text        |  예 | 사람이 읽을 수 있는 요약     |
| before_snapshot | jsonb       | 선택 | 변경 전 요약            |
| after_snapshot  | jsonb       | 선택 | 변경 후 요약            |
| client_context  | jsonb       | 선택 | 요청 환경 요약           |
| created_at      | timestamptz |  예 | 이벤트 발생 시각          |

### 3.2 저장 제외 기준

audit_events에는 다음 값을 저장하지 않는다.

* 실제 API Key
* service role 실제 값
* Owner Token 실제 값
* 비밀번호
* 민감한 개인정보 원문
* 원본 파일 public URL
* signed URL 원문
* 고객에게 불필요한 raw payload 전체

## 4. actor_role 기준

`actor_role` 후보:

* worker
* worker_representative
* manager
* owner
* system
* partner_operator
* unknown

설명:

| actor_role            | 의미                      |
| --------------------- | ----------------------- |
| worker                | 근로자 제출                  |
| worker_representative | 근로자대표 제출                |
| manager               | 현장관리자 또는 관리자 조치         |
| owner                 | Owner Console 또는 내부 운영자 |
| system                | 서버 자동 처리                |
| partner_operator      | 파트너 운영 담당자              |
| unknown               | 식별 불가 또는 초기 데이터         |

actor_label은 고객용 표시명 수준으로 관리한다. 개인정보 원문 저장은 최소화한다.

## 5. source_type 기준

`source_type` 후보:

* company
* site
* worker_share_confirmation
* field_participation
* worker_representative_confirmation_link
* worker_representative_confirmation
* tbm_voice
* evidence_item
* monthly_report
* customer_export
* owner_console
* risk_share_pack
* system_config
* other

source_type은 감사이력이 어느 원장 또는 기능과 연결되는지 나타낸다.

## 6. event_type 기준

### 6.1 링크 관리 이벤트

* representative_link_created
* representative_link_revoked
* representative_link_expired_checked
* representative_link_accessed
* representative_link_create_failed
* representative_link_revoke_failed

기록 대상:

* 근로자대표 확인 링크 생성
* 링크 폐기
* 만료 링크 접근 차단
* 링크 조회
* 링크 생성 실패
* 링크 폐기 실패

주의:
`representative_link_accessed`는 제출 완료가 아니라 링크 조회 또는 접근 이력이다.

### 6.2 제출 이벤트

* worker_share_submitted
* field_participation_submitted
* worker_representative_confirmation_submitted
* tbm_voice_submitted
* submission_rejected
* submission_validation_failed

기록 대상:

* 근로자 공유확인 제출
* 현장참여 제출
* 근로자대표 참여확인 제출
* TBM 음성·작성 제출
* 유효성 검증 실패
* 만료·폐기 링크 제출 차단

### 6.3 관리자 검토 이벤트

* review_status_changed
* action_note_created
* action_note_updated
* action_marked_done
* action_reopened
* review_rejected
* review_follow_up_required

기록 대상:

* 처리상태 변경
* 조치메모 생성·수정
* 조치완료 표시
* 재검토 전환
* 반려
* 추가 확인 필요

주의:
관리자 상태 변경은 운영상 처리상태이며 법적 조치완료 확정으로 표현하지 않는다.

### 6.4 사진·증빙 이벤트

* evidence_uploaded
* evidence_metadata_created
* evidence_metadata_updated
* evidence_archived
* evidence_delete_requested
* evidence_deleted
* evidence_signed_url_issued
* evidence_exported

기록 대상:

* 사진 업로드
* 메타데이터 생성
* 증빙 유형 변경
* 보관 상태 변경
* 삭제 요청
* 실제 삭제
* signed URL 발급
* 고객용 Export 포함

### 6.5 Export 이벤트

* customer_csv_export_created
* evidence_manifest_created
* evidence_zip_export_created
* monthly_report_created
* monthly_report_pdf_created
* export_failed

기록 대상:

* 고객용 CSV 생성
* 증빙목록 생성
* 증빙 ZIP 생성
* 월간보고서 생성
* 월간보고서 PDF 생성
* Export 실패

### 6.6 테넌트 관리 이벤트

* company_created
* company_updated
* company_status_changed
* site_created
* site_updated
* site_status_changed
* service_mode_changed
* plan_type_changed

기록 대상:

* 신규 고객 등록
* 고객 정보 수정
* 현장 등록·수정
* 운영 상태 변경
* 서비스 모드 변경
* 플랜 변경

## 7. before_snapshot / after_snapshot 기준

변경 이벤트에는 필요한 경우 before_snapshot과 after_snapshot을 저장한다.

저장 원칙:

* 전체 row를 그대로 저장하지 않는다.
* 필요한 필드만 요약한다.
* 민감정보 원문은 저장하지 않는다.
* token, service role, 내부 URL은 저장하지 않는다.
* 고객용 Export 대상이 아니어야 한다.

예시:

```json
{
  "review_status": "검토중",
  "action_note_present": true
}
```

```json
{
  "review_status": "조치필요",
  "action_note_present": true
}
```

## 8. client_context 기준

client_context는 요청 환경을 최소 요약한다.

후보:

* user_agent_summary
* ip_hash
* request_source
* route_group
* app_version
* locale

주의:

* IP 원문 저장은 최소화한다.
* 필요 시 hash 또는 요약값으로 저장한다.
* 개인 식별 가능성이 높은 값은 저장하지 않는다.
* 고객에게 client_context 원문을 제공하지 않는다.

## 9. 고객용 표시 기준

고객에게 audit_events 원본을 그대로 제공하지 않는다.

고객에게 제공 가능한 형태:

* 월간 운영 변경 요약
* 관리자 검토 이력 요약
* 링크 생성·폐기 이력 요약
* Export 생성 이력 요약
* 사진 업로드 수 요약

고객용 문구 예시:

* “관리자 검토 상태가 변경되었습니다.”
* “근로자대표 확인 링크가 폐기되었습니다.”
* “고객용 CSV Export가 생성되었습니다.”
* “증빙사진이 업로드되었습니다.”

사용하지 않는 표현:

* “법적 의무가 완료되었습니다.”
* “면책 자료가 생성되었습니다.”
* “조치완료가 법적으로 확정되었습니다.”
* “AI가 판단했습니다.”

## 10. 보존·삭제 기준

audit_events는 운영 이력이므로 삭제보다 보존을 우선한다.

삭제 가능 후보:

* 테스트 이벤트
* 잘못 생성된 초기 개발 이벤트
* 고객 요청에 따른 삭제 검토 대상
* 보존정책상 만료된 이벤트

삭제보다 우선할 수 있는 방식:

* archived 상태
* redacted 상태
* 개인정보 제거 후 보존
* 고객용 표시 제외

## 11. RLS 및 접근통제 기준

기본 원칙:

1. audit_events는 RLS를 활성화한다.
2. public 직접 select는 허용하지 않는다.
3. service role은 서버 전용으로만 사용한다.
4. Owner Console은 Owner 인증 후 조회한다.
5. 고객 화면에는 정제된 요약만 제공한다.
6. 외부 근로자 링크에서는 audit_events 원문을 조회하지 않는다.
7. 고객별 company_id 또는 company_code 필터를 반드시 적용한다.

금지:

* client에서 audit_events 직접 insert
* service role 노출
* 다른 고객사 audit_events 조회
* customer CSV에 audit_events 원본 전체 포함
* raw payload 또는 token 값 저장

## 12. 월간보고서 연결

월간보고서에는 audit_events 원본이 아니라 요약 지표를 반영한다.

후보 지표:

* 링크 생성 건수
* 링크 폐기 건수
* 근로자 제출 건수
* 근로자대표 제출 건수
* 관리자 상태 변경 건수
* 조치메모 변경 건수
* 사진 업로드 건수
* Export 생성 건수

문구 기준:

* “운영 변경 이력”
* “관리자 검토 이력”
* “링크 운영 이력”
* “Export 생성 이력”

사용하지 않는 표현:

* “법적 판단 이력”
* “면책 이력”
* “무재해 보장 이력”

## 13. Risk Share Pack 연결

Risk Share Pack에서는 특히 다음 이벤트를 우선 기록한다.

* representative_link_created
* representative_link_revoked
* representative_link_accessed
* worker_share_submitted
* field_participation_submitted
* worker_representative_confirmation_submitted
* review_status_changed
* customer_csv_export_created

이 이벤트는 공유팩의 핵심 가치인 공유·확인·참여·검토·Export 흐름을 확인하기 위한 운영이력이다.

## 14. 금지 표현

다음 표현은 제품, 제안서, 고객 화면, Export 안내문에서 사용하지 않는다.

* 법적 의무 완료
* 과태료 방지
* 면책 보장
* 무재해 보장
* 위험성평가 대행 대체
* 안전관리대행
* AI 법적 판단
* AI 조치완료 확정
* 근로자대표 승인으로 법적 요건 충족

## 15. 후속 PR 후보

1. audit_events 실제 Supabase migration v1
2. audit event server helper 설계
3. 링크 생성·폐기 audit event 연결
4. 근로자대표 제출 audit event 연결
5. 관리자 상태 변경 audit event 연결
6. 고객용 Export 생성 audit event 연결
7. 월간보고서 운영 변경 이력 요약 블록 설계
8. Owner Console audit viewer 설계
