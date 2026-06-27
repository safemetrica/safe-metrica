# Document Studio Agent Assist Layer v1

## 1. Classification

- Work type: D. 별도 제품축 / 문서 / 제품정의
- Product axis: Document Studio Local Edition + Agent Assist Layer
- Target customer: 반복 자료 수집과 반복 문서 정리가 많은 업체
- Current status: Product architecture / safety boundary document
- Do not touch:
  - Bubblemon QR / submit API / storage / route / monthly report
  - Richi operating route / API / storage
  - Existing customer login / route / storage
  - SafeMetrica production data
  - Supabase / Notion production connection
  - SafeMetrica Vercel routes

## 2. Purpose

Document Studio Agent Assist Layer는 Hermes, browser automation, OCR, RAG, search assistant, local folder watcher 같은 도구를 Document Studio에 직접 섞는 것이 아니라, 반복 자료 수집과 추출 후보 생성을 보조하는 별도 보조 레이어로 정의한다.

핵심 구조:

    Agent Assist Layer
    → Staging Inbox
    → Document Studio 검증 / import / 출력
    → 관리자 확인
    → SafeMetrica evidence package 후보 첨부

Agent는 자료 수집과 후보 정리를 돕는다.
Document Studio는 양식 보존, 입력값 검증, 로컬 DB 저장, 출력물 생성을 담당한다.
SafeMetrica는 운영 원장과 월간 운영기록을 담당한다.

## 3. Product Position

Agent Assist Layer는 Document Studio Core가 아니다.

Agent Assist Layer는 Document Studio에 들어가기 전 단계의 보조 도구다.

정확한 역할:

    Agent Assist Layer
    → 반복 자료 수집 / 파일 정리 / OCR / 텍스트·표 추출 후보 / 분류 후보

    Document Studio Core
    → SQLite 저장 / 중복 방지 / 입력값 검증 / Excel·HWPX·PDF 양식 보존 출력

    SafeMetrica Core
    → 현장 QR / 확인·서명 / 익명 의견 / TBM / 관리자 검토 / 월간 운영기록

## 4. Why This Matters

Document Studio는 기존 Excel, HWPX, PDF 양식을 보존하면서 반복 문서를 정확히 출력하는 제품이다.

그러나 실제 현장에서는 문서 입력 전 단계가 더 번거롭다.

반복되는 전처리 업무:

- 이메일 첨부파일 찾기
- 포털에서 PDF 내려받기
- 계근표 파일 정리
- 카톡/문자 메모 정리
- 사진 파일명 정리
- 엑셀 자료 취합
- 월별 폴더 분류
- PDF 텍스트/표 추출
- 작업지시서와 완료보고서 매칭
- 작업 전/후 사진 짝 맞추기

Agent Assist Layer는 이 전처리 업무를 보조한다.

## 5. Core Principle

Agent는 확정자가 아니다.

Agent는 다음을 하지 않는다.

- DS DB에 바로 확정 저장
- SafeMetrica production DB 직접쓰기
- Supabase service role 보유
- Notion production DB 직접쓰기
- 고객 원본 민감자료를 외부 AI에 무단 업로드
- 위험성평가 완료 판단
- 작업허가 승인
- 법적 적합성 확정
- 안전조치 완료 확정
- HWPX / Excel 양식 임의 재디자인

Agent는 후보를 만든다.
사람이 확인한다.
DS가 검증한다.
문서는 관리자 승인 후 사용한다.

## 6. Good Use Cases

Agent Assist Layer에 적합한 업무:

### WasteManager Pack

- 계근표 PDF 파일 수집 후보
- 월별 PDF 파일명 정리
- PDF 텍스트/표 추출 후보
- 생활폐기물/음식물/재활용 자료 분류 후보
- 민원 메모 분류 후보
- 월별 출력 대상 파일 묶음 생성

### Forklift Work Plan Pack

- 반복 지게차 작업 프로필 후보 정리
- 당일 변경사항 메모 추출 후보
- 사진 파일 정리
- 작업 전/후 확인자료 분류
- PTW Lite 검토 후보 신호 정리
- 월간 지게차 작업 운영자료 후보 정리

### Hoist Work Report Pack

- 작업지시서 파일 수집
- 완료보고서 초안 자료 모음
- 작업 전/후 사진 짝 맞추기 후보
- AS 접수 내역과 완료보고서 매칭 후보
- 고객 확인서 첨부 후보
- 월별 작업현황 후보 정리

### Safety Binder Pack

- 점검표 파일 분류
- 사진대장 후보 정리
- 교육자료 파일 정리
- 월간 안전운영 부록 후보 정리
- Evidence Book 첨부 후보 정리

## 7. Bad Use Cases

Agent Assist Layer에 맡기면 안 되는 업무:

- 최종 문서 확정
- 법적 판단
- 위험성평가 완료 처리
- 작업허가 승인
- 안전조치 완료 처리
- 고객 원본 민감자료 외부 업로드
- 서명 이미지 외부 전송
- 원본 DB 직접 수정
- production DB direct write
- service role 사용
- 기존 Excel/HWPX 양식 임의 변경
- 고객 화면에서 내부 기술어 노출

## 8. Staging Inbox

Agent가 만든 결과물은 바로 DS DB에 들어가지 않는다.

먼저 Staging Inbox로 들어간다.

Staging Inbox의 목적:

- 원본 파일과 추출 후보 분리
- 비식별 사본 관리
- 사람이 확인할 대기함 제공
- DS import 전 검증 단계 제공
- 잘못된 추출값을 바로 확정하지 않도록 방지

Staging Inbox 후보 구조:

    staging-inbox/
      company_alias/
        YYYY-MM/
          00_original/
          01_sanitized/
          02_extracted_text/
          03_extracted_tables/
          04_classification_candidates/
          05_reviewed_for_import/
          06_rejected/
          intake_log.json

## 9. File Handling Rule

파일은 다음 단계로 구분한다.

### Original

고객이 제공한 원본 파일.

주의:

- 외부 AI에 그대로 업로드하지 않는다.
- 민감정보가 포함될 수 있다.
- 내부 보관 권한을 제한한다.

### Sanitized

비식별 처리된 사본.

비식별 대상:

- 실명
- 휴대폰번호
- 주민번호
- 계좌번호
- 사업자등록번호
- 상세주소
- 차량번호 전체
- 서명 이미지
- 고객 담당자 개인정보
- 계약금액
- 단가
- 사고자 정보
- 원청/하청 민감정보

### Extracted Candidate

Agent/OCR/RAG가 만든 후보 데이터.

주의:

- 아직 확정값이 아니다.
- DS import 전 검토가 필요하다.

### Reviewed Import

관리자가 확인한 import 후보.

DS가 이 단계에서 중복 방지, 필수값 검증, 형식 검증 후 저장한다.

## 10. Agent Task Types

Agent Assist Layer의 작업 유형 후보:

### File Collection

- 이메일 첨부파일 찾기
- 지정 폴더 감시
- 다운로드 폴더 정리
- 월별 파일 묶기

### Browser Automation

- 반복 포털 접속
- 파일 다운로드 후보 정리
- 화면 캡처 후보 생성
- 공지/양식 변경 감지

주의:

- 로그인 정보와 인증정보는 안전하게 관리해야 한다.
- 고객 계정 자동조작은 별도 승인 없이는 하지 않는다.

### OCR / Extraction

- PDF 텍스트 추출
- 표 추출
- 이미지 OCR
- 스캔 문서 텍스트 후보 생성
- 작업 전/후 사진 메타 정리 후보

### Classification

- 문서 유형 분류
- Pack 후보 분류
- 월별/일별/현장별 분류
- 출력 대상 문서 후보 분류

### Draft Mapping

- DS 필드 매핑 후보 생성
- 누락값 표시
- 중복 후보 표시
- 검증 필요 항목 표시

## 11. DS Import Gate

Document Studio는 Staging Inbox의 reviewed data만 import한다.

Import Gate 검증 후보:

- 필수값 누락
- 날짜 형식
- 중복 import
- 차량번호 정규화
- 금액 계산
- 톤수/수량 합계
- 누계
- 작업 전/후 사진 짝
- 문서번호 중복
- 월별 잠금 여부
- 양식 버전 확인

검증 실패 시 고객에게 쉬운 문구로 표시한다.

사용 가능한 표현:

- 입력값을 다시 확인해 주세요.
- 같은 자료가 이미 저장되어 있습니다.
- 원본 양식 구조가 변경되어 확인이 필요합니다.
- 사진 파일이 누락되어 확인이 필요합니다.
- 출력 전 담당자 확인이 필요합니다.

피해야 할 표현:

- raw payload error
- schema mismatch
- API failed
- service role
- internal exception
- XML parser stack trace

## 12. SafeMetrica Bridge

Agent Assist Layer는 SafeMetrica production DB에 직접 연결하지 않는다.

허용 흐름:

    Agent 자료 수집 후보
    → Staging Inbox
    → DS 검증 / 출력
    → PDF / Excel / HWPX / ZIP evidence package
    → 관리자 확인
    → SafeMetrica Evidence Book / Monthly Report / PTW Lite review material 후보 첨부

금지:

- Agent가 SafeMetrica 원장에 직접 쓰기
- Agent가 Supabase production에 직접 쓰기
- Agent가 Notion production에 직접 쓰기
- Agent가 월간보고서를 finalized 처리
- Agent가 작업허가를 승인
- Agent가 조치완료를 확정

## 13. Security Boundary

Agent Assist Layer는 최소권한 원칙을 따른다.

원칙:

- production service role 보유 금지
- 실제 환경변수 값 저장 금지
- API Key / Owner Token / secret 노출 금지
- 고객 원본 민감자료 외부 업로드 금지
- 외부 AI 사용 시 비식별 사본만 사용
- 로그에 원문 개인정보 저장 금지
- raw file path와 고객명 외부 노출 주의
- 작업 결과는 후보 상태로만 저장

## 14. Local vs Cloud

Document Studio Local Edition의 기본값은 local-first다.

Agent Assist Layer는 세 가지 모드 후보로 나눌 수 있다.

### Local Assist

- 로컬 폴더 감시
- 로컬 OCR
- 로컬 파일명 정리
- 로컬 SQLite staging

### Private Server Assist

- 자체 가상서버에서 반복 수집
- 내부 저장소로 staging
- 외부 AI 전송 제한
- 접근권한 통제 필요

### External AI Assist

- 외부 AI 또는 브라우저 에이전트 활용
- 반드시 비식별 사본 또는 공개자료만 사용
- 고객 원본자료, 서명, 개인정보, 토큰, 환경변수 업로드 금지

## 15. Business Value

Agent Assist Layer가 붙으면 Document Studio의 사업성은 커진다.

기존 DS 가치:

    기존 양식 보존
    입력값 검증
    반복 문서 출력

Agent Assist 추가 가치:

    매일 반복 자료 수집 보조
    파일 정리 자동화 후보
    OCR/표 추출 후보
    문서 분류 후보
    담당자 검토 대기함
    DS import 준비

고객 체감 문구:

    매일 흩어지는 자료를 모으고,
    반복 문서에 들어갈 값을 후보로 정리한 뒤,
    담당자가 확인하면 기존 양식 그대로 보고서와 첨부자료를 출력할 수 있게 돕습니다.

## 16. Product Naming Candidate

내부명:

- Agent Assist Layer
- Hermes Agent Lab
- DS Intake Agent
- Document Studio Staging Agent

고객 노출명 후보:

- 자료정리 보조
- 문서수집 보조
- 반복자료 정리함
- 가져오기 대기함
- 문서 자동정리 보조

고객 화면에서는 Agent, Hermes, RAG, OCR 같은 내부 용어를 과도하게 노출하지 않는다.

## 17. Implementation Priority

현재는 코드 구현하지 않는다.

우선순위:

1. Agent Assist Layer 구조 문서화
2. Sample Intake Protocol과 연결
3. Staging Inbox 필드 후보 정리
4. WasteManager 계근표 PDF / 월별 파일 정리부터 후보 검토
5. Hyundai Hoist 작업지시서/사진 샘플 수령 후 후보 검토
6. Forklift Pack 당일 변경사항/사진 정리 후보 검토
7. 실제 코드화는 샘플과 반복성이 확인된 뒤 진행

## 18. Risk

### Risk 1. 자동확정 오해

Agent가 모든 것을 처리한다고 보이면 위험하다.

대응:

    Agent는 후보만 만든다.
    DS가 검증한다.
    관리자가 확정한다.

### Risk 2. 민감정보 외부 유출

반복자료에는 개인정보, 서명, 계약금액, 고객정보가 포함될 수 있다.

대응:

    외부 AI 사용 전 비식별 사본만 사용한다.
    원본은 내부 보관한다.

### Risk 3. 양식 훼손

Agent가 문서를 새로 꾸미면 DS의 핵심 가치가 깨진다.

대응:

    양식 편집은 DS Template Engine이 담당한다.
    Agent는 추출 후보만 만든다.

### Risk 4. 운영 원장 오염

잘못 추출한 값이 SafeMetrica 원장에 바로 들어가면 위험하다.

대응:

    Staging Inbox와 관리자 승인 단계를 둔다.

## 19. Copy Guard

금지 표현:

- AI가 모든 문서를 자동 완성
- 법적 제출자료 자동 확정
- 위험성평가 자동 완료
- 작업허가 자동 승인
- 안전조치 자동 완료
- 중대재해 면책
- 과태료 방지 보장
- 무재해 보장
- 고객자료 자동 수집/자동 제출
- 완전 무인 문서처리

사용 가능한 표현:

- 반복 자료 수집 보조
- 문서 분류 후보
- OCR 추출 후보
- 담당자 검토 대기함
- DS import 후보
- 기존 양식 출력 지원
- evidence package 후보
- 관리자 검토 후 반영

## 20. Current Decision

현재 결정:

    Agent Assist Layer는 Document Studio Core가 아니다.
    Agent Assist Layer는 DS 이전 단계의 자료 수집·추출·분류 보조 레이어다.
    Staging Inbox를 거쳐 사람이 확인한 뒤 DS에 import한다.
    SafeMetrica production DB에는 직접 연결하지 않는다.
    연결은 PDF / Excel / HWPX / ZIP evidence package 방식으로만 검토한다.
    AI와 Agent는 후보 제안자이며 최종 확정자는 관리자와 사업주다.
