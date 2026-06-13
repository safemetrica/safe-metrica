# SafeMetrica Risk Share Pack Customer Link Table Template v1

- 문서 성격: Risk Share Pack 고객별 링크 관리 표준 템플릿
- 적용 범위: 고객 온보딩, QR 배포, 관리자 홈, 월간요약, 내부 Export
- 목적: 고객별 링크 혼선과 company context 누락을 방지한다.

---

## 1. 기본 원칙

Risk Share Pack 고객별 링크는 company code 기준으로 관리한다.

근로자 현장참여 링크에는 반드시 company query가 포함되어야 한다.

형식:

- /field/participation?company={companyCode}

company query가 빠진 /field/participation 링크는 QR로 배포하지 않는다.

---

## 2. 고객별 링크 표

| 고객사 | company code | 관리자 홈 | 근로자 공유확인·현장 의견 | 근로자대표 참여확인 관리 | 공유팩 월간요약 | 내부 운영자 Export |
|---|---|---|---|---|---|---|
| 한국그린환경 | hankookgreen | /manager/risk-share | /field/participation?company=hankookgreen | /manager/representative-confirmations | /monthly-report/risk-share | /manager/risk-share |
| 대도환경 | daedo | /manager/risk-share | /field/participation?company=daedo | /manager/representative-confirmations | /monthly-report/risk-share | /manager/risk-share |
| 동우환경 | dongwoo | /manager/risk-share | /field/participation?company=dongwoo | /manager/representative-confirmations | /monthly-report/risk-share | /manager/risk-share |
| 버블몬코리아 | bubblemon | /manager/risk-share | /field/participation?company=bubblemon | /manager/representative-confirmations | /monthly-report/risk-share | /manager/risk-share |
| 신규 고객 | {companyCode} | /manager/risk-share | /field/participation?company={companyCode} | /manager/representative-confirmations | /monthly-report/risk-share | /manager/risk-share |

---

## 3. 링크별 용도

### 3.1 관리자 홈

- route: /manager/risk-share
- 용도: 공유팩 전체 현황, 링크 표, 월간요약, Export, 접수함 이동
- 접근: 관리자 또는 내부 운영자 기준

### 3.2 근로자 공유확인·현장 의견

- route: /field/participation?company={companyCode}
- 용도: 근로자 공유확인, 의견 없음 제출, 위험제보, 아차사고, 개선제안
- 접근: 현장 QR 또는 현장 링크
- 주의: company query 필수

### 3.3 근로자대표 참여확인 관리

- route: /manager/representative-confirmations
- 용도: 근로자대표 확인 linkId 생성, 제출 현황, 폐기·만료 관리
- 주의: 근로자대표 제출 링크는 고정 URL이 아니라 linkId 방식으로 발급한다.

### 3.4 공유팩 월간요약

- route: /monthly-report/risk-share
- 용도: 공유확인, 현장 의견, 근로자대표 참여확인 중심의 월간 운영요약
- 주의: Full SafeMetrica 월간보고서와 구분한다.

### 3.5 내부 운영자 Export

- route: /manager/risk-share
- 용도: 내부 운영자가 고객 전달자료 CSV를 확인 후 다운로드
- 주의: 고객 직접 무제한 다운로드 구조로 운영하지 않는다.

---

## 4. QR 배포 전 확인

QR 배포 전 아래를 확인한다.

- 고객사명이 맞는가
- company code가 맞는가
- 근로자 링크에 company query가 포함되어 있는가
- QR 촬영 시 해당 고객사 화면이 열리는가
- 다른 고객사 화면으로 이동하지 않는가
- 제출 후 관리자 홈 summary에 반영되는가
- 내부 인증정보가 노출되지 않는가
- 내부 원장 주소가 노출되지 않는가
- 금지 표현이 없는가

---

## 5. 금지 표현

고객별 링크 표, QR 포스터, 영업자료에 아래 표현을 사용하지 않는다.

- 법적 의무 완료
- 과태료 방지
- 면책 보장
- 무재해 보장
- 위험성평가 대행
- 안전관리대행
- QR 제출만으로 책임 완료
- 시스템이 처벌을 막아준다

---

## 6. 운영 판단

고객별 링크 표는 영업자료가 아니라 내부 운영 기준표다.

영업 또는 고객 안내 시에는 필요한 링크만 선별해 전달한다.

전체 링크 표, 내부 Export 기준, Owner 운영 흐름은 외부에 그대로 공유하지 않는다.
