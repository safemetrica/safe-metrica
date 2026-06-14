# SafeMetrica Product Structure & Link Guide v1

작업명: `docs: add safemetrica product structure link guide v1`  
기준일: 2026-06-14

## 1. 목적

이 문서는 SafeMetrica의 제품 구조, 고객 설명용 링크, 내부 전용 링크, 제안서 v2 방향, 다음 개발 우선순위를 정리하기 위한 기준 문서다.

SafeMetrica는 하나의 앱 안에서 아래 4개 층위로 구분한다.

1. Full SafeMetrica
2. Risk Share Pack
3. Partner Demo
4. Owner / Admin Console

이 구분을 명확히 해야 고객에게 과장 없이 설명할 수 있고, 제안서·데모·운영자료가 섞이지 않는다.

## 2. SafeMetrica 한 문장 정의

SafeMetrica는 근로자의 확인과 제보, 현장관리자의 조치, 대표의 운영 확인을 하나의 안전운영 기록으로 연결하는 산업안전 운영기록 SaaS다.

AI는 법적 판단자나 조치 확정자가 아니라 후보 제안자이며, 최종 판단과 책임은 관리자와 사업주에게 있다.

## 3. 전체 제품 구조

SafeMetrica는 아래 구조로 설명한다.

- Full SafeMetrica
  - TBM
  - PTW
  - Evidence Book
  - 위험성평가 운영
  - 현장참여 / 위험제보
  - 대표 대시보드
  - 월간보고서
  - 고객용 Export

- Risk Share Pack
  - 위험성평가 공유 QR
  - 근로자 공유확인
  - 위험제보 / 아차사고 / 개선제안
  - 사진 증빙 첨부
  - 관리자 접수함
  - 근로자대표 참여확인
  - 월간 공유팩 요약
  - 고객용 Export

- Partner Demo
  - 근로자 체험
  - 현장관리자 체험
  - 대표 체험
  - 샘플 데이터 기반 체험

- Owner / Admin Console
  - 고객사 선택
  - 내부 Export
  - 고객용 CSV Export
  - 운영 점검
  - 내부 관리자 기능

## 4. Full SafeMetrica와 Risk Share Pack 차이

| 구분 | Full SafeMetrica | Risk Share Pack |
|---|---|---|
| 목적 | 사업장 안전운영 전체 기록 | 위험성평가 공유·참여·검토 기록 |
| 대상 | TBM, PTW, EB, 대표 대시보드까지 필요한 고객 | 위험성평가 공유확인과 근로자 참여 기록부터 시작할 고객 |
| 근로자 QR | 포함 | 핵심 기능 |
| 위험성평가 공유확인 | 포함 | 핵심 기능 |
| 위험제보 / 아차사고 / 개선제안 | 포함 | 핵심 기능 |
| 사진 증빙 | 포함 | 포함 |
| TBM 음성작성 | 포함 | 기본 제외 |
| PTW | 포함 또는 단계 적용 | 기본 제외 |
| Evidence Book | 포함 | 기본 제외 |
| 대표 대시보드 | 포함 | 공유팩 월간요약 중심 |
| 월간보고서 | 전체 운영형 보고서 | 공유팩 운영요약 |
| 고객용 Export | 포함 | 포함 |
| Owner Console | 내부 전용 | 외부 노출 금지 |

## 5. Risk Share Pack 상세 흐름

Risk Share Pack은 위험성평가를 대신 작성하는 서비스가 아니다.

고객이 보유한 위험성평가 자료 또는 평가결과지를 바탕으로, 위험성평가 이후의 공유·확인·참여·검토·증빙·월간요약·Export 흐름을 운영기록으로 정리한다.

흐름:

1. 고객 위험성평가 자료 제공
2. 내부 운영자가 공유 대상 위험요인 정리
3. 고객 확인
4. QR 또는 linkId 활성화
5. 근로자 위험요인 확인
6. 공유확인 또는 의견 제출
7. 위험제보 / 아차사고 / 개선제안 접수
8. 사진 증빙 첨부
9. 관리자 접수함 검토
10. 근로자대표 참여확인
11. Supabase 원장 저장
12. evidence_items 증빙 메타데이터 저장
13. 고객용 evidence_manifest Export
14. Risk Share Pack 월간보고서 증빙요약
15. 다음 위험성평가 재검토 후보 축적

## 6. 데이터 원장 구조

Risk Share Pack의 핵심 데이터 원장은 아래 구조로 본다.

| 원장 | 역할 |
|---|---|
| `field_participation_submissions` | 공유확인, 위험제보, 아차사고, 개선제안 제출 원장 |
| `evidence_items` | 사진·파일 증빙 메타데이터 원장 |
| `worker_representative_confirmations` | 근로자대표 참여확인 원장 |
| `customer-csv export` | 고객 전달용 CSV Export |

사진 원본은 DB에 직접 저장하지 않는다.  
파일 원본은 Blob/Storage에 저장하고, DB에는 URL과 메타데이터를 저장한다.

## 7. 고객에게 보여줄 수 있는 링크

### Risk Share Pack

| 용도 | 링크 |
|---|---|
| 공유팩 관리자 홈 | `/manager/risk-share` |
| 근로자 현장참여 | `/field/participation` |
| 위험성평가 공유요약 | `/field/participation/risk-summary` |
| 제출 완료 | `/field/participation/submitted` |
| 근로자대표 참여확인 | `/field/representative-confirmation?linkId=...` |
| 근로자대표 확인 관리 | `/manager/representative-confirmations` |
| 공유팩 월간보고서 | `/monthly-report/risk-share` |

### Full SafeMetrica

| 용도 | 링크 |
|---|---|
| 홈 | `/home` |
| TBM | `/tbm` |
| PTW | `/ptw` |
| Evidence Book | `/ebm` |
| 현장 홈 | `/field` |
| 현장 음성 | `/field/voice` |
| 위험성평가 | `/risk` |
| 위험성평가 보고서 | `/risk/report` |
| 대표 대시보드 | `/dashboard` |
| 전체 월간보고서 | `/monthly-report` |

### Partner Demo

| 용도 | 링크 |
|---|---|
| 데모 홈 | `/partner-demo` |
| 근로자 체험 | `/partner-demo/worker` |
| 관리자 체험 | `/partner-demo/manager` |
| 대표 체험 | `/partner-demo/ceo` |
| 현장참여 체험 | `/partner-demo/field-participation` |
| TBM 체험 | `/partner-demo/tbm` |

## 8. 외부 노출 금지 링크

아래는 내부 운영자 전용이다.

| 용도 | 링크 |
|---|---|
| Owner Console | `/owner` |
| 고객 선택 | `/select-tenant` |
| Owner login API | `/api/owner/login` |
| Owner select API | `/api/owner/select` |
| 고객용 CSV API 직접 URL | `/api/admin/export/customer-csv` |
| 내부 JSON Export API | `/api/admin/export` |

Owner Token, API Key, service role, 환경변수 실제 값은 문서, 채팅, GitHub, 제안서에 남기지 않는다.

## 9. Partner Demo 기준

Partner Demo는 정식앱의 과장판이 아니다.

Partner Demo는 실제 고객 데이터 없이 SafeMetrica의 핵심 운영 흐름을 설명하는 샘플 모드다.

Partner Demo에 노출하지 않는 것:

- 실제 고객 데이터
- 실제 고객 사진
- Owner Console
- Notion DB
- Supabase 원본 DB
- API 직접 호출
- 토큰
- 환경변수 값
- 실제 제보 원문

## 10. 제안서 v2 수정 기준

현재 제안서에서 유지할 것:

- 위험성평가 작성 이후 공유·참여·기록이 중요하다는 문제 제기
- QR 접속
- 공유확인과 위험제보 분리
- 관리자 검토
- 클라우드 원장
- 월간요약
- 고객용 Export
- 가격 후보

수정할 것:

- 어두운 배경 과다 사용 축소
- 흐릿한 이미지 교체
- 법령/과태료 장표 간결화
- `안전관리대행` 문구 제거
- 법적 면책이나 과태료 방지 보장처럼 보일 수 있는 표현 제거
- Supabase, Notion 같은 내부 기술명은 고객용 장표에서 최소화
- `클라우드 안전운영 데이터 원장`, `고객용 증빙목록 Export` 중심으로 표현

## 11. 고객 미팅 5분 설명 흐름

1. 위험성평가표 작성 여부 확인
2. 근로자에게 실제 공유했는지 확인
3. 공유확인 기록이 남는지 확인
4. 위험제보나 개선의견이 들어왔을 때 누가 검토하는지 확인
5. 근로자대표 참여확인 필요 여부 확인
6. 월간 요약자료가 필요한지 확인
7. 기존 자료를 받아 공유팩 세팅 가능 여부 확인
8. 견적은 근로자 수, 현장 수, 자료 상태, 운영지원 범위에 따라 안내

## 12. 다음 개발 우선순위

1. 제안서 v2 리디자인
2. TBM voice uploaded files → evidence_items 연결
3. Owner evidence ledger 조회
4. 고객용 Excel/PDF Export
5. Source Intake / Share Item Builder
6. PTW 음성 초안 작성지원
7. Work Signal 위험신호 후보
8. Full SafeMetrica 대표 대시보드 고도화
9. 안전문서 AI Intake
10. 살아있는 위험성평가 재검토 후보 자동화

## 13. 금지 표현

아래 표현은 고객자료, 앱 화면, 제안서, 계약서, 미팅 멘트에서 사용하지 않는다.

- 위험성평가 대행
- 안전관리대행
- 법적 의무 완료 보장
- 과태료 방지 보장
- 중대재해 면책
- 무재해 보장
- AI가 법적 판단
- AI가 조치완료 확정
- QR 제출만으로 법적 의무 완료
- 완전 익명 보장

## 14. 결론

SafeMetrica는 Full 앱, Risk Share Pack, Partner Demo, Owner/Admin을 명확히 구분해서 설명해야 한다.

Risk Share Pack은 전체 SafeMetrica의 축소판이 아니라 위험성평가 공유 이후의 확인·참여·검토·증빙·월간요약·Export를 관리형으로 운영하는 진입형 상품이다.

Full SafeMetrica는 TBM, PTW, Evidence Book, 대표 대시보드, 전체 월간보고서까지 확장되는 산업안전 운영기록 SaaS다.

제안서 v2는 기능을 많이 보여주는 자료가 아니라 고객이 10초 안에 구조를 이해하게 만드는 자료로 정리한다.
