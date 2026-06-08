# SafeMetrica Customer-facing Export v1 설계 기준

- 기준일: 2026-06-08
- 문서 성격: 고객 전달용 Export 기준 문서
- 대상: 월간보고서, TBM 기록, 현장참여, 위험제보, 조치현황, 증빙자료의 고객 전달 패키지 기준
- 참고 문서:
  - `docs/data/SAFEMETRICA_SUPABASE_EXPORT_SPEC_V1.md`
  - `docs/data/SAFEMETRICA_SUPABASE_EXPORT_VIEWS_V1.md`
  - `docs/data/SAFEMETRICA_SUPABASE_LEDGER_SCHEMA_V1.md`
  - `docs/data/SAFEMETRICA_SUPABASE_LEDGER_CURRENT_STATE.md`
  - `docs/product/SAFEMETRICA_FEATURE_TRUTH_INVENTORY.md`

## 1. 목적

이 문서는 SafeMetrica 내부 Supabase JSON 백업과 고객 전달용 Export를 명확히 분리하기 위한 v1 설계 기준이다.

Customer-facing Export의 목적은 다음과 같다.

- 내부 운영자용 JSON 백업과 고객 전달용 Export를 분리한다.
- 고객에게 제공 가능한 파일 형식과 포함/제외 데이터를 정의한다.
- 월간보고서, TBM 기록, 현장참여, 위험제보, 증빙자료를 고객이 이해 가능한 형태로 정리하는 기준을 만든다.

이 문서는 설계 문서이며 실제 CSV, Excel, ZIP, PDF 생성 기능을 구현하지 않는다.

## 2. 기본 원칙

Customer-facing Export v1은 다음 원칙을 따른다.

- 내부 JSON 백업은 고객에게 직접 제공하지 않는다.
- 고객 전달용 자료는 정제된 PDF, Excel, CSV, 증빙 ZIP 형태로 제공한다.
- `raw_payload`, `snapshot`, `notion_properties_snapshot` 등 내부 원장 필드는 고객 전달용에서 제외한다.
- Notion URL, Supabase 내부 UUID, service role, API Key, 환경변수 정보는 고객 전달용에서 제외한다.
- AI는 후보 제안자이며 최종 판단과 책임은 관리자와 사업주에게 있다.
- 법적 면책, 처벌 방지, KOSHA 인정 보장, 무재해 보장 표현은 사용하지 않는다.

## 3. Export 모드 구분

SafeMetrica Export는 목적과 수신자에 따라 다음 2개 모드로 구분한다.

### 3.1 Internal Backup Export

Internal Backup Export는 Owner 내부 백업용 Export다.

| 항목 | 기준 |
| --- | --- |
| 대상 사용자 | Owner 및 내부 운영자 |
| 파일 형식 | JSON |
| 목적 | Supabase 원장 복구 및 운영 검수 |
| 내부 데이터 포함 | 가능 |
| 고객 제공 | 금지 |

Internal Backup Export는 Supabase 원장 복구와 내부 운영 검수를 위한 백업이다. 따라서 `raw_payload`, `snapshot` 등 내부 데이터를 포함할 수 있으나 고객에게 직접 제공해서는 안 된다.

### 3.2 Customer-facing Export

Customer-facing Export는 고객 전달용 Export다.

| 항목 | 기준 |
| --- | --- |
| 대상 사용자 | 고객사 담당자, 현장 관리자, 사업주 |
| 파일 형식 | PDF, Excel, CSV, 증빙 ZIP |
| 목적 | 안전운영 기록의 고객 전달, 월간보고서 근거 정리, 증빙자료 제공 |
| 내부 데이터 포함 | 제외 |
| 고객 제공 | 가능 |

Customer-facing Export는 월간보고서, TBM 기록, 공유확인, 위험제보, 조치현황, 증빙목록을 중심으로 구성한다. 내부 필드는 제거하고 고객이 읽을 수 있는 용어와 컬럼으로 정리한다.

## 4. 고객 전달 패키지 후보

고객에게 제공할 수 있는 패키지 후보는 다음과 같다.

| 패키지 후보 | 형식 | 설명 |
| --- | --- | --- |
| 월간 안전운영 보고서 | PDF | 기간별 안전운영 활동 요약과 주요 특이사항 정리 |
| TBM 기록 | Excel | TBM 일자, 작업유형, 위험요인, 안전공지, 증빙 여부 정리 |
| 근로자 공유확인 | Excel | 공유확인 제출 기록과 처리상태 정리 |
| 위험제보 / 아차사고 / 개선제안 | Excel | 현장 참여 제출 중 위험, 아차사고, 개선 제안 기록 정리 |
| 조치현황 | Excel | 위험요인별 조치유형, 담당자, 기한, 완료일, 상태 정리 |
| 증빙목록 | CSV | 증빙번호, 관련 기록, 파일명, 포함 여부 정리 |
| 증빙사진 | ZIP | 고객 제공이 필요한 사진 파일 패키지 |
| 전체 요약 ZIP 패키지 | ZIP | PDF, Excel, CSV, 증빙사진을 함께 묶은 고객 전달 패키지 |

## 5. 고객 전달용 Excel 시트 구조

Customer-facing Excel Export의 후보 시트는 다음과 같다.

| 시트명 | 목적 |
| --- | --- |
| `01_월간요약` | 기간별 안전운영 활동 요약 |
| `02_TBM기록` | TBM 제출과 관련 증빙 요약 |
| `03_근로자공유확인` | 근로자 공유확인 제출 기록 정리 |
| `04_위험제보_아차사고_개선제안` | 위험제보, 아차사고, 개선제안 통합 정리 |
| `05_조치현황` | 조치 필요 항목과 조치 완료 현황 정리 |
| `06_증빙목록` | 고객 전달 대상 증빙 파일 manifest |
| `07_주의사항` | 자료 해석과 책임 범위 안내 |

### 5.1 `01_월간요약`

후보 컬럼은 다음과 같다.

- 업체명
- 기간
- TBM 기록 수
- 공유확인 수
- 위험제보 수
- 아차사고 수
- 개선제안 수
- 조치필요 수
- 조치완료 수
- 증빙파일 수
- 월간 주요 특이사항

### 5.2 `02_TBM기록`

후보 컬럼은 다음과 같다.

- 날짜
- 시간
- 작업유형
- 작업위치
- 작성자
- 주요 위험요인
- 안전공지
- 특이사항 여부
- 조치상태
- 증빙사진 여부

### 5.3 `03_근로자공유확인`

후보 컬럼은 다음과 같다.

- 날짜
- 업체명
- 제출구분
- 제목
- 내용 요약
- 작성자
- 익명 여부
- 처리상태
- 증빙 여부

### 5.4 `04_위험제보_아차사고_개선제안`

후보 컬럼은 다음과 같다.

- 날짜
- 구분
- 제목
- 위치
- 내용
- 작성자
- 익명 여부
- 처리상태
- 사진첨부 여부
- 월간보고서 반영 후보 여부

### 5.5 `05_조치현황`

후보 컬럼은 다음과 같다.

- 위험요인
- 조치유형
- 조치내용
- 담당자
- 기한
- 완료일
- 상태
- 조치사진 여부

### 5.6 `06_증빙목록`

후보 컬럼은 다음과 같다.

- 증빙번호
- 날짜
- 관련기록 유형
- 관련 제목
- 파일명
- 증빙유형
- 파일 포함 여부
- 비고

### 5.7 `07_주의사항`

후보 내용은 다음과 같다.

- 본 자료는 안전운영 기록의 정리 자료임
- 최종 판단과 조치 책임은 사업주 및 관리자에게 있음
- AI 제안은 후보이며 법적 판단 확정이 아님
- 법적 면책 또는 처벌 방지를 보장하지 않음
- 원본 데이터는 회사 내부 운영기준에 따라 보관됨

## 6. 고객 전달용에서 제외할 필드

다음 필드는 Customer-facing Export에서 제외한다.

- `raw_payload`
- `snapshot`
- `notion_properties_snapshot`
- `notion_page_id`
- `notion_url`
- `notion_page_url`
- `pageUrl`
- Supabase 내부 UUID
- service role
- API Key
- 환경변수명과 값
- 내부 라우트 경로
- 내부 디버그 메시지
- owner/admin 전용 링크
- 전체 원본 transcript 중 고객에게 불필요한 장문 원문

## 7. 고객 전달용에 포함 가능한 필드

Customer-facing Export에 포함 가능한 필드는 다음과 같다.

- 업체명
- 기간
- 날짜
- 기록유형
- 제목
- 위치
- 주요 내용
- 위험요인
- 조치상태
- 작성자 또는 익명 여부
- 증빙 여부
- 증빙번호
- 월간보고서 반영 후보 여부
- 관리자가 확인한 메모

## 8. 파일 제공 방식

고객 전달 파일 제공 방식은 다음 기준을 따른다.

- PDF와 Excel은 기본 제공 후보로 둔다.
- 증빙사진은 필요 시 ZIP으로 제공한다.
- ZIP 파일에는 암호를 설정하는 것을 권장한다.
- 암호는 파일과 다른 채널로 전달한다.
- 고객에게 내부 JSON 원본을 직접 전달하지 않는다.

## 9. v1 구현 범위 후보

후속 구현 시 v1 범위 후보는 다음과 같다.

- Owner 내부에서 customer export 모드 선택
- JSON 내부 백업과 고객 전달용 export 구분
- 고객 전달용 CSV 또는 Excel 생성
- `raw_payload`와 `snapshot` 제거
- `evidenceManifest` 기반 증빙목록 생성
- 파일 다운로드명 표준화

### 9.1 파일명 후보

- `safemetrica-customer-export-{companyKey}-{startDate}-{endDate}.xlsx`
- `safemetrica-evidence-manifest-{companyKey}-{startDate}-{endDate}.csv`
- `safemetrica-monthly-report-{companyKey}-{yearMonth}.pdf`
- `safemetrica-evidence-package-{companyKey}-{startDate}-{endDate}.zip`

## 10. v1에서 하지 않는 것

Customer-facing Export v1 문서화와 후속 v1 구현 범위에서는 다음을 제외한다.

- 실제 Excel 생성 구현
- 실제 ZIP 생성 구현
- Blob 파일 다운로드 구현
- 월간보고서 PDF 재설계
- 고객 공개 화면 생성
- DB schema 변경
- SQL migration 생성
- RLS 정책 변경
- Notion 구조 변경

## 11. 권장 후속 작업

권장 후속 작업 순서는 다음과 같다.

1. 고객 전달용 Export Spec 문서 확정
2. customer export field mapper 설계
3. CSV 다운로드 v1
4. Excel 다운로드 v1
5. evidence manifest CSV
6. 증빙 ZIP v2
7. 월간보고서 PDF와 연결
8. 고객별 Export 이력 로그 설계

## 12. 금지 표현

Customer-facing Export, 월간보고서, 고객 전달 패키지, 화면 문구, 안내문에서는 다음 표현을 사용하지 않는다.

- 법적 면책
- 처벌 방지
- 과태료 방지
- 중대재해 면책
- 무재해 보장
- KOSHA 인정 보장
- 위험성평가 대행
- AI가 법적 판단 확정
- 법적 증빙 완료
