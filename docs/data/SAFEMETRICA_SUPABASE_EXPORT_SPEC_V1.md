# SafeMetrica Supabase Export v1 설계 기준

## 1. 문서 목적

Export v1은 Supabase에 쌓인 업체별 안전운영 기록을 지정한 기간 단위로 백업하기 위한 설계 기준이다.

Export 결과는 다음 용도로 활용할 수 있는 기반을 제공한다.

- 월간보고서 작성의 근거자료
- 업체별 증빙 패키지 생성
- 안전운영 기록의 기간별 보관 및 확인

데이터 원장(source of truth)은 Supabase로 본다. Notion은 관련 문서나 운영 기록을 연결하는 보조 링크로만 취급하며, Export v1의 원장 기준으로 사용하지 않는다.

## 2. Export 필터 기준

### 2.1 `company_key`

`company_key`는 서로 다른 제출 데이터의 업체 식별 필드를 Export 기준에서 하나의 값으로 정규화한 필터다.

| 원본 데이터 | 원본 필드 | Export v1 정규화 필드 |
| --- | --- | --- |
| 현장 참여 제출 기록 | `field_participation_submissions.tenant_code` | `company_key` |
| TBM 음성 제출 기록 | `tbm_voice_submissions.company_code` | `company_key` |

Export 대상은 요청된 `company_key`와 일치하는 특정 업체의 기록으로 제한한다. 전체 고객사의 데이터를 제한 없이 한 번에 Export하는 기능은 허용하지 않는다.

### 2.2 `period`

`period`는 `startDate`부터 `endDate`까지의 Export 대상 기간이다.

- 시작 기준: `startDate`
- 종료 기준: `endDate`
- 향후 구현 시 시작일과 종료일의 포함 여부, 시간대, 기준 timestamp 컬럼은 API 계약과 데이터 모델에 맞춰 명시적으로 확정한다.

### 2.3 `role`

향후 Export 기능을 구현할 때는 다음 권한을 가진 사용자만 실행할 수 있도록 제한한다.

- `owner`
- 관리자 권한을 가진 사용자

화면 노출 여부만으로 권한을 판단하지 않으며, 향후 구현 시 서버 측에서 인증과 권한을 검증해야 한다.

## 3. 향후 구현 후보

다음 항목은 Export v1의 향후 구현 후보이며, 이번 PR에서는 구현하지 않는다.

### 3.1 API 후보

- `/api/admin/export`
- `/api/owner/export`

### 3.2 화면 후보

- 관리자 Console의 업체별 백업 다운로드 화면
- Owner Console의 업체별 백업 다운로드 화면

후보 경로와 화면은 구현 확정안이 아니며, 실제 구현 시 권한 모델과 기존 라우팅 구조를 검토해 결정한다.

## 4. 이번 PR 범위

이번 PR은 Export v1 설계 기준 문서 추가만을 범위로 한다.

다음 작업은 포함하지 않는다.

- 애플리케이션 코드 수정
- API 생성
- 화면 수정
- SQL migration 생성
- DB 수정
- Notion 수정
- Supabase 설정 또는 데이터 수정
- 환경변수 수정

## 5. 금지 사항

Export v1의 문서화 및 향후 구현에서는 다음 사항을 금지한다.

- service role, API Key 또는 환경변수의 실제 값 문서화
- 전체 고객사 데이터를 대상으로 하는 무제한 Export
- 법적 면책을 보장하는 표현
- 처벌 방지를 보장하는 표현
- KOSHA 인정 또는 승인을 보장하는 표현
