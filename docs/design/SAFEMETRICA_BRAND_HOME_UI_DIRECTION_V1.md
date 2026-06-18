# SafeMetrica Brand & Home UI Direction v1

## 1. 목적

이 문서는 SafeMetrica의 브랜드, 고객 첫 화면, 근로자 QR 화면, 리치코리아 체험판, Partner Demo, 제안서/명함 디자인 방향을 통일하기 위한 기준 문서다.

기존 다크/테크 UI는 내부 운영자 화면과 Owner Console에서는 유지할 수 있으나, 신규 고객과 현장 근로자가 처음 보는 화면은 더 밝고 친근한 B2B SaaS 톤으로 정리한다.

## 2. 브랜드 포지션

핵심 표현:

    친근하지만 가볍지 않은 산업안전 운영기록 SaaS

제품 정의:

    현장의 확인·제보·조치·보고를 하나의 안전운영 기록으로 연결하는 SaaS

SafeMetrica는 법적 판단자나 조치 확정자가 아니라, 운영기록을 남기고 관리자가 확인할 수 있도록 돕는 시스템이다.

## 3. 시각 방향

로고/심볼 후보 요소:

- 방패
- 사람
- 체크
- 부드러운 곡선
- 데이터 흐름
- 약한 미소 또는 친근한 인상

주의:

- 너무 귀엽거나 키즈앱처럼 보이면 안 된다.
- 산업안전 B2B SaaS 신뢰감을 유지한다.
- 딥네이비를 넓게 깔아 인쇄 가독성을 떨어뜨리는 방향은 피한다.
- 명함, 제안서, 고객 첫 화면은 화이트 기반을 우선한다.

## 4. 컬러 기준

주요 색상 후보:

- Deep Navy: #0B2742
- Safety Teal: #16A085
- Support Green: #35C878
- Light Mint: #EAF8F3
- Cool Gray: #64748B
- White: #FFFFFF

적용 원칙:

- 고객 첫 화면: White / Light Mint / Cool Gray 중심
- CTA, 정상 상태, 확인 완료: Safety Teal 또는 Support Green
- 제목/브랜드 강조: Deep Navy
- Owner/Admin 내부 화면: 기존 다크톤 일부 유지 가능
- 경고/미조치 신호: 과한 원색보다 절제된 amber/red 계열 사용

## 5. 적용 우선순위

1. 고객 첫 진입 홈
2. 근로자 QR 화면
3. 리치코리아 1주일 체험판
4. Partner Demo
5. 제안서 / 명함 / 랜딩
6. 관리자 홈
7. 대표 홈
8. Owner Console

Owner Console은 내부 운영자 화면이므로 전체 라이트톤 전환 대상이 아니다. 보안, 운영, Export, 백오피스 기능은 기존 다크톤을 유지해도 된다.

## 6. 홈 화면 구조 방향

고객 첫 화면은 명함 시안의 정리된 느낌을 반영한다.

상단 영역:
- SafeMetrica™ 로고
- 짧은 슬로건
- 고객사명
- 역할 정보
- 부드러운 곡선 그래픽 또는 얇은 라인 포인트

메인 카드 영역:
- 큰 흰색 카드
- 짧은 문장
- 체크/확인 아이콘
- 미조치 또는 확인 필요 신호는 명확히 표시
- 긴 설명문은 줄이고, 상세는 접힘 또는 하위 화면으로 이동

하단 영역:
- 신뢰와 안전
- 모두의 참여
- 확인과 개선
- 데이터 기반
- 지속 가능한 안전문화

이 하단 가치는 은은한 푸터 형태로 사용한다. 기능 버튼보다 시각적 위계가 높아지면 안 된다.

## 7. 근로자 QR 화면 원칙

근로자 QR 화면은 30초 UX를 기준으로 한다.

원칙:
- 큰 버튼
- 짧은 문장
- 한 화면에서 할 일 명확화
- 불필요한 설명 최소화
- 긴 원문, AI 분석, 운영 메타데이터는 기본 접힘
- 확인/의견/사진첨부 흐름을 분리

리치코리아 체험판:
- QR 기반 전자확인 기록
- 불편사항
- 개선의견
- 위생·안전 확인
- 기타

리치코리아에서는 위험제보, 아차사고 같은 강한 표현을 초기 체험판 전면에 과하게 노출하지 않는다.

## 8. 관리자 화면 원칙

현장관리자 화면은 오늘 할 일 중심으로 정리한다.

우선 표시:
- 오늘 TBM 작성/확인
- 현장참여 접수함
- 미완료 조치
- 사진증빙 상태
- 확인 필요 항목

기본 접힘:
- STT 원문
- AI 정리 전문
- 긴 위험요인 목록
- 메타데이터

## 9. 대표 화면 원칙

대표 화면은 상세 작업보다 운영 신호를 먼저 보여준다.

우선 표시:
- 긴급 운영 상태
- 오늘 처리 필요
- 대표 Risk 확인 신호
- 운영 완결성 요약
- 한 줄 브리핑

금지:
- AI가 법적 판단을 완료했다는 표현
- 조치 완료 확정 표현
- 처벌 방지 또는 면책 보장 표현

## 10. Partner Demo 원칙

Partner Demo는 정식앱의 과장판이 아니라 정식앱 핵심 흐름의 샘플 모드다.

원칙:
- 실제 고객 데이터 없음
- Owner Console 없음
- Notion DB 없음
- Supabase 실제 운영 원장 없음
- API Key / Token / 환경변수 없음
- 근로자 확인 → 관리자 조치 → 대표 확인 → 월간요약 흐름만 체험

Partner Demo는 신규 브랜드 톤을 가장 먼저 반영할 수 있다.

## 11. Supabase-first 신규업체 기준과의 관계

신규업체는 Supabase/PostgreSQL-first tenant_registry 기준으로 온보딩한다.

리치코리아와 현대호이스트 같은 신규업체는 legacy Notion Companies DB를 원장으로 사용하지 않는다.

브랜드/홈 UI 개편도 신규 tenant 구조와 충돌하지 않게 진행한다.

신규 tenant 화면은 아래 기준을 따른다.
- tenant_registry company_code
- service_mode
- enabled_modules
- status
- plan_type

기존업체는 legacy Notion bridge를 유지하면서 점진 전환한다.

## 12. 사용 가능한 문구

- 안전운영 기록 SaaS
- 현장의 확인·제보·조치·보고를 하나의 기록으로
- 위험성평가 공유·참여 기록
- 근로자 위험제보·의견수렴
- 관리자 검토·조치 기록
- 대표 확인·월간보고서
- 고객 전달용 Export
- QR 기반 전자확인 기록
- 현장 피드백 운영기록

## 13. 금지 문구

- 법적 면책
- 처벌 방지
- 무재해 보장
- 사고 방지 보장
- 위험성평가 대행
- 안전관리대행
- HACCP 인증 보장
- 법적 효력 보장
- 종이서명 완전 대체 보장
- AI가 법적 판단 또는 조치완료를 확정한다는 표현

## 14. 개발 적용 순서

1. 브랜드/홈 UI 방향 문서 잠금
2. CSS token 후보 문서화
3. 고객 첫 화면 또는 Partner Demo 라이트톤 실험
4. 근로자 QR 화면 일부 적용
5. 리치코리아 체험판 화면 적용
6. 대표 홈 카드 단위 적용
7. 관리자 홈 카드 단위 적용
8. Owner Console은 별도 검토

한 번에 전체 UI를 바꾸지 않는다. 역할별, 화면별, 카드별로 나눠 적용한다.

## 15. 후속 PR 후보

1. docs: define SafeMetrica design tokens v1
2. feat: add brand design token constants
3. feat: refresh partner demo home visual style
4. feat: refresh worker QR visual style for trial tenants
5. feat: refresh richi trial QR visual shell
6. feat: refresh customer home hero card
