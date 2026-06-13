# SafeMetrica Risk Share Pack Manager Home v1

* 기준일: 2026-06-13
* 문서 성격: Risk Share Pack 전용 관리자 홈 설계 기준
* 적용 범위: Risk Share Pack 신규 고객, 관리자 홈, 공유확인, 현장참여, 근로자대표 확인, 월간보고서, 고객 Export
* 주의: 본 문서는 법적 판단, 면책, 처벌 방지, 무재해 보장 문서가 아니다.

## 1. 목적

이 문서는 Risk Share Pack만 사용하는 고객을 위한 전용 관리자 홈 구조를 정의한다.

Risk Share Pack 고객은 SafeMetrica 전체 운영형 고객과 다르다. 따라서 TBM, PTW, EB, 대표 대시보드 전체형 메뉴를 기본 노출하지 않고, 위험성평가 결과 공유 이후의 확인·의견·근로자대표 참여확인·관리자 검토·월간보고서·고객 Export 흐름에 집중하는 화면을 제공한다.

핵심 목적은 다음이다.

* 공유팩 고객의 메뉴 혼선을 줄인다.
* 전체 SafeMetrica 운영형과 Risk Share Pack 상품 경계를 명확히 한다.
* 신규 고객 온보딩 후 바로 사용할 수 있는 관리자 첫 화면을 정의한다.
* linkId 기반 공유 링크, 근로자 확인, 근로자대표 확인, Export를 하나의 운영 흐름으로 연결한다.
* 고객에게 법적 완료나 면책 보장으로 오해될 수 있는 표현을 차단한다.

## 2. 제품 경계

Risk Share Pack Manager Home은 다음 기능을 중심으로 한다.

* 위험성평가 공유 링크 관리
* 근로자 공유확인 현황
* 위험제보·아차사고·개선제안 접수함
* 근로자대표 참여확인 링크 생성
* 근로자대표 제출 기록 확인
* 링크 만료·폐기 관리
* 관리자 검토 상태
* 월간 공유팩 요약
* 고객용 CSV Export
* 테스트 데이터 정리 안내

기본 노출하지 않는 기능:

* TBM 전체 운영
* PTW
* EB
* 대표 대시보드 전체형
* 전체 SafeMetrica 월간 운영 화면
* Owner Console
* Notion 내부 백오피스 링크
* Supabase 내부 URL
* 내부 API 경로

## 3. 사용자 역할

### 3.1 관리자

Risk Share Pack 관리자 역할:

* 공유 링크 생성
* 공유확인 현황 확인
* 제보·아차사고·개선제안 검토
* 근로자대표 확인 링크 생성
* 링크 폐기·만료 관리
* 처리상태 및 조치메모 관리
* 월간 요약 확인
* 고객용 CSV Export 다운로드

### 3.2 근로자

근로자 역할:

* 위험성평가 결과 공유 확인
* 위험요인 확인
* 안전조치 주지 확인
* 의견 없음 제출
* 위험제보 제출
* 아차사고 제출
* 개선제안 제출

### 3.3 근로자대표

근로자대표 역할:

* linkId 기반 확인 링크 접속
* 현장명과 확인 범위 확인
* 별도 의견 없음 제출
* 보완 의견 제출
* 개인정보 수집·이용 안내 확인

## 4. 홈 화면 정보 구조

Risk Share Pack Manager Home의 첫 화면은 다음 순서로 구성한다.

1. 오늘 운영 상태
2. 공유 링크 만들기
3. 최근 공유확인 현황
4. 현장 의견 접수함
5. 근로자대표 참여확인
6. 링크 운영 통제
7. 월간 공유팩 요약
8. 고객용 Export
9. 운영 주의 문구

## 5. 상단 요약 카드

상단에는 4개 핵심 카드를 표시한다.

### 5.1 전체 제출

표시 내용:

* 이번 달 근로자 공유확인 제출 수
* 위험제보·아차사고·개선제안 제출 수
* 근로자대표 참여확인 제출 수

문구 후보:

```text
이번 달 공유·참여 제출
```

### 5.2 검토 필요

표시 내용:

* 미확인
* 검토 필요
* 보완 요청
* 조치 필요

문구 후보:

```text
관리자 검토 필요
```

### 5.3 보완 의견

표시 내용:

* 근로자 의견 있음
* 근로자대표 보완 의견 있음
* 사진 또는 추가 확인 필요

문구 후보:

```text
보완 의견
```

### 5.4 Export 준비

표시 내용:

* 고객용 CSV 생성 가능 여부
* 월간보고서 확인 여부
* 증빙목록 후보 여부

문구 후보:

```text
고객 전달 준비
```

## 6. 공유 링크 만들기 영역

관리자가 위험성평가 결과 공유 링크 또는 근로자대표 확인 링크를 만들 수 있는 영역이다.

### 6.1 위험성평가 공유 링크

입력 후보:

* 현장명
* 공유할 평가 기간
* 공유할 작업 또는 위험성평가 범위
* 만료일
* 링크 설명

기능 후보:

* 공유 링크 생성
* QR 생성 후보
* 링크 복사
* 링크 만료일 설정
* 링크 폐기

### 6.2 근로자대표 확인 링크

입력 후보:

* 현장명
* 오늘 확인할 내용
* 만료일

기능:

* linkId 기반 URL 생성
* 외부 URL에 companyCode, siteName, confirmationScope 직접 노출 금지
* 최근 발급 링크 목록 갱신
* 링크 폐기
* 만료 상태 표시
* 최근 접근 시각 표시

주의:

* 최근 접근은 제출 완료가 아니라 링크 조회 또는 접근 시각이다.
* 폐기된 링크는 삭제보다 revoked 상태로 관리한다.

## 7. 최근 공유확인 현황

근로자 공유확인 제출 현황을 표시한다.

표시 후보:

* 제출일시
* 현장명
* 확인 유형
* 의견 여부
* 증빙 여부
* 처리상태
* 관리자 메모 여부

상태 후보:

* 접수
* 검토중
* 조치필요
* 조치완료
* 반려

주의:

* 공유확인은 조치완료 확정이 아니다.
* 조치상태는 관리자 검토와 조치메모를 함께 확인한다.

## 8. 현장 의견 접수함

근로자 위험제보·아차사고·개선제안 접수함이다.

표시 후보:

* 제출일시
* 제출유형
* 위치·구역
* 제목 또는 요약
* 사진 여부
* 처리상태
* 조치메모
* 다음 평가주기 후보 여부

제출유형 후보:

* 위험제보
* 아차사고
* 개선제안
* 칭찬
* 기타

관리자 액션 후보:

* 검토중으로 변경
* 조치필요로 변경
* 조치완료로 변경
* 반려
* 조치메모 추가
* 다음 평가주기 후보 표시

주의:

* 위험제보는 관리자 검토 전까지 조치완료로 표현하지 않는다.
* AI가 제안한 분류는 후보이며 최종 판단은 관리자와 사업주가 한다.

## 9. 근로자대표 참여확인 영역

근로자대표 참여확인 링크와 제출 기록을 함께 관리한다.

### 9.1 링크 관리

표시 후보:

* 현장명
* 확인 범위
* 상태
* 생성일
* 만료일
* 최근 접근
* 링크 폐기 버튼

상태 후보:

* 사용 가능
* 폐기됨
* 만료됨

### 9.2 제출 기록

표시 후보:

* 제출일시
* 확인일
* 현장명
* 근로자대표 성명
* 소속·작업조
* 별도 의견 여부
* 보완 의견 여부
* 검토상태
* 고객 전달 비고

검토상태 후보:

* 미확인
* 확인
* 검토 필요
* 보완 요청
* 검토 완료
* 반려

주의:

* 근로자대표 참여확인은 운영기록이다.
* 위험성평가 완료 확정, 조치완료 확정, 법적 책임 이전으로 표현하지 않는다.

## 10. 월간 공유팩 요약

Risk Share Pack 고객에게는 전체 SafeMetrica 월간보고서가 아니라 공유팩 중심 요약을 우선 노출한다.

표시 후보:

* 근로자 공유확인 수
* 의견 없음 제출 수
* 위험제보 수
* 아차사고 수
* 개선제안 수
* 근로자대표 참여확인 수
* 보완 의견 수
* 관리자 검토 필요 수
* 조치메모 작성 수
* 고객용 Export 준비 상태

문구 기준:

```text
위험성평가 공유 이후의 확인·의견·검토 흐름을 월간 운영기록으로 정리합니다.
```

사용하지 않는 표현:

```text
위험성평가 의무가 완료되었습니다.
법적 조치가 완료되었습니다.
면책 자료가 생성되었습니다.
```

## 11. 고객용 Export 영역

관리자가 고객에게 전달 가능한 정제 CSV를 다운로드하는 영역이다.

Export 후보:

* 근로자 공유확인 CSV
* 위험제보·아차사고·개선제안 CSV
* 근로자대표 참여확인 CSV
* 증빙목록 CSV
* 월간 운영보고서 PDF 후보

고객용 Export 제외 항목:

* Supabase 내부 UUID
* raw_payload
* snapshot
* linkId 원문
* Owner 링크
* 내부 API 경로
* token
* service role
* 환경변수명 또는 실제 값
* 고객 민감정보 중 불필요한 원문

주의 문구:

```text
고객 전달용 자료는 내부 원장과 분리된 정제 컬럼만 포함합니다.
```

## 12. 메뉴 구성

Risk Share Pack 전용 관리자 홈 메뉴 후보:

* 홈
* 공유확인
* 현장 의견
* 근로자대표 확인
* 월간 요약
* 고객 Export
* 링크 관리

기본 숨김:

* TBM
* PTW
* EB
* Owner
* Partner Demo
* 전체 대표 대시보드

확장 안내 후보:

```text
TBM, PTW, EB, 대표 대시보드까지 필요한 경우 Full SafeMetrica 운영형으로 확장할 수 있습니다.
```

## 13. 라우트 후보

전용 관리자 홈 라우트 후보:

```text
/risk-share/manager
```

또는 기존 관리자 구조와 맞출 경우:

```text
/manager/risk-share
```

초기 판단:

* 기존 `/manager/representative-confirmations`와 충돌하지 않게 별도 홈을 둔다.
* 기존 기능은 재사용하되, 공유팩 전용 홈에서 필요한 카드만 연결한다.
* 내부 Owner 화면과 고객 관리자 화면은 분리한다.

## 14. 데이터 소스 기준

Risk Share Pack Manager Home이 참조할 Supabase 원장 후보:

* companies
* sites
* worker_share_confirmations
* field_participation_submissions
* worker_representative_confirmation_links
* worker_representative_confirmations
* evidence_items
* audit_events
* export_jobs 후보

초기 구현은 이미 존재하는 원장부터 연결한다.

우선 연결 대상:

* worker_representative_confirmation_links
* worker_representative_confirmations
* customer CSV export route
* 기존 field participation records
* 월간보고서 공유팩 블록

## 15. 권한 및 보안 기준

기본 원칙:

1. 공유팩 관리자 홈은 고객별 company_code 또는 company_id 기준으로 필터링한다.
2. 외부 linkId URL에는 companyCode, siteName, confirmationScope를 직접 노출하지 않는다.
3. client에서 service role을 사용하지 않는다.
4. Owner Token은 고객 화면에 노출하지 않는다.
5. 고객용 Export는 whitelist 방식으로만 생성한다.
6. Storage 원본 path와 signed URL은 고객 CSV에 포함하지 않는다.
7. 다른 고객사 기록이 섞이지 않게 한다.

## 16. UI 문구 기준

허용 문구:

* 공유·참여 운영기록
* 근로자 확인 흐름
* 현장 의견 접수
* 근로자대표 참여확인
* 관리자 검토
* 월간 운영요약
* 고객 전달용 Export
* 다음 평가주기 보완 후보

금지 문구:

* 법적 의무 완료
* 과태료 방지
* 면책 보장
* 무재해 보장
* 위험성평가 대행 대체
* 안전관리대행
* AI 법적 판단
* AI 조치완료 확정
* 근로자대표 승인으로 법적 요건 충족

## 17. 구현 우선순위

### 17.1 v1

* Risk Share Pack 전용 관리자 홈 문서화
* 홈 상단 요약 카드
* 근로자대표 확인 링크 관리 카드 재사용
* 최근 근로자대표 제출 기록 재사용
* 고객용 CSV Export 링크 연결
* 공유팩 주의 문구 적용

### 17.2 v2

* 근로자 공유확인 현황 연결
* 현장 의견 접수함 연결
* 처리상태 변경 UI
* 공유팩 월간 요약 전용 화면
* QR 이미지 생성
* 링크별 제출 현황 연결

### 17.3 v3

* companies / sites 기반 완전 테넌트 전환
* evidence_items 연결
* audit_events 연결
* export_jobs 연결
* 고객별 권한 모델 고도화

## 18. 후속 PR 후보

1. Risk Share Pack manager home UI skeleton
2. Risk Share Pack route guard and tenant mode check
3. Risk Share Pack summary cards
4. Risk Share Pack export panel
5. Risk Share Pack monthly summary mode
6. Risk Share Pack field participation inbox
7. Risk Share Pack representative confirmation status update
8. Risk Share Pack QR link generator
