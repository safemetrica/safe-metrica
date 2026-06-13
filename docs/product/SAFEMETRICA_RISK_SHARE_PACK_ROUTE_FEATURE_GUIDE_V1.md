# SafeMetrica Risk Share Pack Route & Feature Guide v1

* 문서 성격: Risk Share Pack route / 기능 / 역할 / 데이터 흐름 기준 문서
* 적용 범위: Risk Share Pack 관리자 홈, 근로자 공유확인, 위험제보, 근로자대표 참여확인, 월간보고서, 고객용 Export
* 기준 상태: #426 ~ #431 반영 이후
* 작성 목적: 기능 확장 중 Risk Share Pack, Full SafeMetrica App, Partner Demo의 경계를 혼동하지 않도록 내부 기준을 잠근다.

---

## 1. 전체 제품 구조

SafeMetrica는 하나의 운영기록 SaaS를 세 가지 표면으로 운영한다.

### 1.1 Risk Share Pack

위험성평가 이후의 공유·확인·참여·검토·요약·Export 흐름을 다루는 진입상품이다.

포함 범위:

* 위험성평가 공유확인
* 의견 없음 제출
* 위험제보
* 아차사고
* 개선제안
* 근로자대표 참여확인
* 관리자 검토
* 공유팩 월간 요약
* 고객용 Export 후보

Risk Share Pack은 위험성평가를 대신 작성하는 서비스가 아니다.

### 1.2 Full SafeMetrica App

전체 안전운영형 SaaS다.

포함 범위:

* TBM
* PTW
* Evidence Book
* 위험성평가 현황
* 현장참여
* 근로자대표 참여확인
* 대표 대시보드
* 월간보고서
* 고객용 Export
* Owner 내부 관리

### 1.3 Partner Demo

실제 고객 데이터 없이 SafeMetrica 핵심 흐름을 보여주는 샘플 모드다.

노출 금지:

* 실제 고객명
* 실제 고객 사진
* 실제 Notion DB
* Supabase 직접 호출
* Owner Console
* token
* API Key
* 환경변수 값
* 실제 고객 민감정보

---

## 2. 역할별 route 기준

### 2.1 근로자

대표 route:

* `/field/participation`
* `/field/participation/risk-summary`
* `/field/participation/submitted`

주요 기능:

* 위험요인 확인
* 위험성평가 공유확인
* 안전조치 주지 확인
* 의견 없음 제출
* 위험제보 / 아차사고 / 개선제안 제출
* 사진 첨부

### 2.2 근로자대표

대표 route:

* `/field/representative-confirmation`

주요 기능:

* linkId 기반 참여확인 링크 접속
* 현장명과 확인범위 확인
* 별도 의견 없음 또는 보완 의견 입력
* 참여확인 제출

### 2.3 현장관리자 / 관리자

대표 route:

* `/manager/risk-share`
* `/manager/representative-confirmations`
* `/field/voice`
* `/monthly-report`

주요 기능:

* 공유팩 관리자 홈 확인
* 공유확인 / 위험제보 / 아차사고 / 개선제안 요약 확인
* 근로자대표 확인 링크 생성
* 근로자대표 참여확인 제출 현황 확인
* 월간보고서 확인
* 고객용 Export 준비 상태 확인

### 2.4 대표

대표 route:

* `/home?role=ceo`
* `/dashboard`
* `/monthly-report`
* `/risk/report`

주요 기능:

* 운영요약 확인
* 검토 필요 항목 확인
* 월간보고서 확인
* 위험성평가표 / 조치 흐름 확인

### 2.5 Owner / 내부 운영자

대표 route:

* `/owner`

주요 기능:

* 고객사 선택
* 내부 Export 확인
* 고객용 CSV Export 확인
* 원장 백업 확인
* 운영 오류 확인

Owner 화면은 외부 공유하지 않는다.

---

## 3. Risk Share Pack 핵심 route

### 3.1 `/manager/risk-share`

Risk Share Pack 전용 관리자 홈이다.

현재 기능:

* 현재 업체 표시
* 업체 코드 표시
* 근로자 공유확인 건수
* 위험제보·아차사고·개선제안 건수
* 관리자 검토 필요 건수
* 근로자대표 참여확인 건수
* 보완 의견 있음 건수
* 사용 가능 근로자대표 확인 링크 수
* 근로자대표 참여확인 관리 이동
* 월간보고서 이동
* 현장 의견 접수함 이동

보안 기준:

* `getCompanyConfig()` 기반 tenant context 필요
* 정적 공개 페이지 금지
* dynamic route 유지
* `mons` submit-only context는 접근 제외

기대 route 상태:

```text
ƒ /manager/risk-share
```

### 3.2 `/manager/representative-confirmations`

근로자대표 참여확인 관리자 접수함이다.

현재 기능:

* 근로자대표 확인 링크 생성
* 최근 발급 링크 확인
* 링크 폐기
* 제출된 근로자대표 참여확인 확인
* 보완 의견 여부 표시
* 검토상태 표시

연결 데이터:

* `worker_representative_confirmations`
* `worker_representative_confirmation_links`

### 3.3 `/field/representative-confirmation`

근로자대표가 외부 링크로 접속해 참여확인을 제출하는 화면이다.

운영 기준:

* 장기 운영은 `linkId` 기반
* URL에 회사코드, 현장명, 확인범위를 직접 노출하지 않는다.
* 서버가 linkId 원장을 조회해 authoritative source로 사용한다.

### 3.4 `/field/participation`

근로자 공유확인, 의견 없음 제출, 위험제보, 아차사고, 개선제안 제출 화면이다.

운영 기준:

* QR / 링크 접근 가능
* 관리자 화면과 원장 조회는 보호
* 공유확인은 조치완료 KPI에 섞지 않는다.
* 위험제보 / 아차사고 / 개선제안만 관리자 검토대상으로 본다.

### 3.5 `/field/voice`

현장참여 접수함이다.

Risk Share Pack에서의 의미:

* 근로자 공유확인과 검토대상 제출을 구분한다.
* 위험제보, 아차사고, 개선제안은 관리자 검토 흐름으로 연결한다.

### 3.6 `/monthly-report`

월간 안전운영 요약 화면이다.

Risk Share Pack 확장 방향:

* 공유확인
* 위험제보 / 아차사고 / 개선제안
* 근로자대표 참여확인
* 검토 필요 항목
* 고객 전달용 요약 후보

---

## 4. 데이터 구조 기준

### 4.1 Companies SSOT

Companies / Tenant Config는 SafeMetrica의 단일 진실 기준이다.

역할:

* 업체 코드
* 업체명
* 테넌트 설정
* DB 연결 기준
* Risk 모듈 사용 여부
* service mode 후보

원칙:

* DB 이름 추론으로 고객사를 찾지 않는다.
* route는 현재 선택된 tenant context를 기준으로 동작한다.

### 4.2 `field_participation_submissions`

근로자 공유확인, 의견 없음 제출, 위험제보, 아차사고, 개선제안 원장이다.

Risk Share Pack summary 기준:

* 공유확인 성격은 공유확인으로 분리
* 공유확인이 아닌 제출은 위험제보·개선의견 그룹으로 분리
* 공유확인은 조치 KPI에서 제외
* 공유확인이 아닌 제출 중 조치완료 또는 반려가 아닌 항목은 관리자 검토 필요 후보

고객 화면에 노출하지 않는 항목:

* raw_payload
* notion_url
* notion_page_url
* 내부 UUID
* token
* API Key
* 환경변수 값
* 내부 디버그 메시지

### 4.3 `worker_representative_confirmations`

근로자대표 참여확인 제출 원장이다.

summary 기준:

* 전체 제출 건수
* 보완 의견 있음 건수
* 검토 필요 건수
* 검토상태별 분류

### 4.4 `worker_representative_confirmation_links`

근로자대표 확인 링크 원장이다.

summary 기준:

* active / revoked / expired 구분
* 사용 가능 링크 수
* last_used_at 확인
* 링크 폐기 / 만료 상태 확인

---

## 5. 기능 상태 기준

### 5.1 현재 운영 가능

* Risk Share Pack 관리자 홈 route
* tenant guard
* 현재 업체 표시
* 근로자대표 참여확인 summary
* 근로자대표 링크 summary
* field participation summary
* 근로자대표 확인 링크 생성
* 근로자대표 확인 링크 폐기
* 근로자대표 참여확인 제출
* 현장참여 제출
* 고객용 CSV Export 일부 dataset

### 5.2 제한 운영

* 월간보고서 Risk Share Pack 전용 모드
* 고객용 Export 패널
* 공유팩 전용 접수함 상태 변경
* 링크 만료일 UI
* QR 이미지 생성

### 5.3 준비 중

* Risk Share Pack export panel
* 공유팩 월간 요약 카드
* route별 상세 사용 가이드 홈
* 고객 온보딩 화면
* 링크 재발급 이력
* Owner Console에서 공유팩 원장 조회

### 5.4 장기 검토

* 법령 원문/RAG 기반 기준 검색
* AI 문서 Intake
* Evidence Intelligence 고도화
* Physical AI Safety Decision Layer
* Sensor / CCTV / Wearable 연동

---

## 6. 표현 기준

금지 표현:

* 법적 의무 완료
* 과태료 방지
* 면책 보장
* 무재해 보장
* 위험성평가 대행
* 안전관리대행
* KOSHA 인정 보장
* AI가 법적 판단
* AI가 조치완료 확정
* QR 제출만으로 법적 의무 완료
* 시스템이 처벌을 막아준다

권장 표현:

* 운영기록 확인
* 공유·참여 기록
* 관리자 검토 흐름
* 조치 확인 과정 기록
* 월간 요약
* 고객 전달용 Export
* 사후 설명자료로 활용 가능한 운영기록

---

## 7. 다음 PR 후보

1. Risk Share Pack export panel
2. Risk Share Pack monthly summary mode
3. Risk Share Pack QR link generator
4. Risk Share Pack field participation inbox refinement
5. Representative confirmation review status update
6. Route & Feature Guide Home UI
7. Full SafeMetrica route map
8. Partner Demo truth map refresh

---

## 8. 운영 판단

Risk Share Pack은 전체 SafeMetrica의 축소판이 아니다.

Risk Share Pack은 위험성평가 이후의 공유·확인·참여·검토·요약·Export에 집중하는 진입상품이다.

Full SafeMetrica App은 TBM, PTW, EB, 위험성평가, 현장참여, 대표 대시보드, 월간보고서를 모두 포함하는 전체 운영형이다.

Partner Demo는 실제 고객 데이터 없이 핵심 흐름을 설명하는 샘플 모드다.

세 구조는 분리되어야 하지만, 데이터 원칙과 표현 기준은 하나로 유지한다.
