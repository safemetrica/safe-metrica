# SafeMetrica TBM Test Data Cleanup Checklist — Daedo 2026-06-18

## 1. 목적

이 문서는 대도환경에서 말로 TBM 테스트를 진행한 뒤 생성된 테스트 기록을 정리하기 위한 기준 문서다.

이번 테스트에서 확인된 핵심은 다음과 같다.

- 말로 TBM 저장 기능은 작동했다.
- 그러나 모바일 TBM 화면에서 STT 원문과 AI 정리문이 길게 노출되어 현장관리자가 핵심 위험요인과 오늘 확인사항을 빠르게 보기 어렵다.
- 따라서 테스트 데이터 정리와 모바일 TBM 카드 압축 UI 개선을 분리한다.

## 2. 배경

과거 TBM 음성작성 고도화에서 SafeMetrica 앱은 다음 구조로 변경되었다.

    음성 녹음
    → TBM 내용 자동 정리
    → 사진 촬영/첨부
    → SafeMetrica 앱에서 바로 저장
    → Notion TBM DB에 기록 저장

또한 Supabase tbm_voice_submissions는 음성 제출 원장 또는 백업성 기록으로 사용될 수 있다.

따라서 대도환경 테스트 TBM은 Supabase만 삭제해서는 정리됐다고 볼 수 없다.

확인 대상은 다음과 같다.

    1. Supabase tbm_voice_submissions
    2. Notion 대도환경 TBM DB
    3. 사진 첨부 또는 파일 URL 참조
    4. 화면에서 실제로 읽는 TBM source

## 3. 정리 원칙

### 3-1. 삭제보다 식별이 먼저다

테스트 데이터로 보이는 기록이 있어도 바로 삭제하지 않는다.

먼저 아래 항목을 식별한다.

    - company_code 또는 tenant가 daedo인지
    - 생성일시가 테스트 시점과 일치하는지
    - 작업명 또는 내용에 테스트 성격이 있는지
    - STT 원문 또는 AI 정리문이 테스트 입력인지
    - Notion page와 Supabase row가 같은 제출 흐름인지
    - 사진 파일이 실제 현장 증빙인지 테스트 첨부인지

### 3-2. Supabase만 정리하지 않는다

/api/tbm/voice-submit 흐름은 Notion TBM DB page 생성이 포함된 구조다.

따라서 Supabase에서만 테스트 row를 삭제하면 다음 문제가 남을 수 있다.

    - 모바일 TBM 화면에 Notion TBM record가 계속 보일 수 있음
    - 월간보고서 또는 TBM 목록에 테스트 TBM이 남을 수 있음
    - Export 또는 내부 백업에서 Supabase와 Notion 기록이 불일치할 수 있음

### 3-3. 실제 고객 기록과 테스트 기록을 섞지 않는다

대도환경 실제 TBM 기록은 운영기록이다.

테스트 기록 정리 시 실제 현장 TBM을 삭제하거나 덮어쓰지 않는다.

삭제 가능 후보:

    - 명백한 테스트 문구
    - 현장 운영과 무관한 음성 테스트
    - 중복 클릭으로 생성된 명백한 중복 record
    - 사진이 테스트 첨부임이 확인된 record

보류 후보:

    - 실제 작업명 포함
    - 실제 작업자/관리자 확인 흐름과 연결
    - 실제 사진 첨부
    - 월간보고서 또는 운영기록에 반영 가능성이 있는 record

## 4. Supabase 확인 체크리스트

실제 토큰, service role, API Key, 환경변수 값은 문서나 채팅에 기록하지 않는다.

Owner 또는 관리자 권한이 있는 안전한 환경에서만 확인한다.

### 4-1. 조회 기준

아래 SQL은 실제 컬럼명에 맞게 조정한다.

    select *
    from tbm_voice_submissions
    limit 1;

대도환경 후보 조회는 아래 성격으로 진행한다.

    select
      id,
      company_code,
      created_at,
      work_title,
      inferred_intent,
      uploaded_files
    from tbm_voice_submissions
    where company_code = 'daedo'
    order by created_at desc
    limit 30;

### 4-2. 확인할 항목

    - 최근 제출 중 테스트로 보이는 row 수
    - Notion page URL 또는 Notion page id 참조 여부
    - uploaded_files 또는 evidence 관련 참조 여부
    - raw_payload 안에 clientSubmissionId 또는 테스트 식별 단서 존재 여부
    - 중복 제출 여부

### 4-3. 금지

    - 확인 전 DELETE 실행 금지
    - 실제 고객 기록 일괄 삭제 금지
    - raw_payload 전체를 외부 문서에 복사 금지
    - token, API Key, service role, 환경변수 값 기록 금지

## 5. Notion 대도환경 TBM DB 확인 체크리스트

대도환경 TBM DB에서 아래 항목을 확인한다.

    - 작업명
    - 날짜
    - 시작시간 / 종료시간
    - 실시자
    - 핵심 위험요인
    - 작업 태그
    - 작업 유형
    - 오늘의 주의사항
    - 특이사항
    - 특이사항 내용
    - 사진 첨부 4종
      - 참석·서명사진
      - 작업 전 현장사진
      - 작업사진
      - 특이사항·조치사진
    - 연결 Risk Item
    - 연결 EB

확인 기준:

    1. 테스트로 명확한 TBM인지 확인
    2. Supabase row와 같은 제출인지 확인
    3. 실제 현장 사진이 붙어 있으면 삭제 보류
    4. 실제 월간보고서에 반영될 수 있으면 삭제 보류
    5. 명백한 테스트 record만 삭제 또는 별도 표시 검토

## 6. 정리 방식 후보

### A. 명백한 테스트 record

처리 기준:

    - Supabase row 확인
    - Notion TBM page 확인
    - 사진 첨부 확인
    - 삭제 전 간단한 내부 메모 또는 스크린샷 보관
    - Notion record 삭제 또는 테스트 표시
    - Supabase row 삭제 또는 내부 테스트 제외 처리

### B. 실제 현장 운영 record일 가능성이 있는 경우

처리 기준:

    - 삭제하지 않음
    - 테스트 여부 확인 필요로 보류
    - 월간보고서 반영 여부 확인
    - 필요 시 관리자 메모로 보완

### C. 중복 제출로 보이는 경우

처리 기준:

    - 같은 시각, 같은 작업명, 같은 내용, 같은 사진이면 중복 후보
    - 원본 1건은 보존
    - 나머지는 삭제 또는 테스트 제외 처리
    - 중복 원인은 UI submit lock과 서버 중복 방지 상태를 별도 점검

## 7. 모바일 TBM UI 개선과의 관계

테스트 데이터 정리와 모바일 UI 개선은 별도 PR로 처리한다.

다음 PR 후보:

    fix: compact mobile tbm cards and hide raw voice text

모바일 TBM 카드 v1 목표:

    - 작업명
    - 위험 태그 3~5개
    - 오늘 확인사항 2~3줄
    - 사진첨부 상태
    - 상세 보기 버튼
    - STT 원문 기본 접힘
    - AI 정리 전문 기본 접힘

상세 보기에서만 표시할 항목:

    - 음성 인식 원문
    - AI 정리 전문
    - 사진 분류 상세
    - 연결 위험요인 상세
    - 관리자 검토용 메타데이터

## 8. 문구 기준

사용 가능한 표현:

    - TBM 운영기록
    - 음성 기반 TBM 작성
    - 작업 전 확인사항
    - 사진증빙 상태
    - 관리자 확인 필요
    - 모바일 요약 보기
    - 상세 보기

피해야 할 표현:

    - AI가 TBM 이행을 확정
    - AI가 교육 완료를 확정
    - AI가 조치 완료를 확정
    - 법적 효력 보장
    - 면책 또는 처벌 회피 보장
    - 무재해 보장

## 9. 완료 기준

이 문서 PR의 완료 기준은 다음과 같다.

    - 대도환경 테스트 TBM 정리 대상이 Supabase와 Notion 양쪽임을 명확히 기록
    - 삭제 전 확인 항목 정의
    - 실제 고객 운영기록 삭제 방지 원칙 기록
    - 모바일 TBM 카드 압축은 후속 PR로 분리
    - 토큰/API Key/Owner Token/환경변수 실제 값 미기록

## 10. 후속 작업

    1. Supabase tbm_voice_submissions 대도환경 테스트 후보 조회
    2. Notion 대도환경 TBM DB 테스트 후보 확인
    3. 실제 삭제 또는 보류 판단
    4. 모바일 TBM 카드 압축 구현
    5. STT 원문과 AI 전문 기본 접힘 처리
    6. 대도환경 모바일 화면 재확인
