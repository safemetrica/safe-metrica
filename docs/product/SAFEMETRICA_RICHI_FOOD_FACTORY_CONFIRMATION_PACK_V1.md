# SafeMetrica Richi Food Factory Confirmation Pack v1

## 1. 목적

본 문서는 리치코리아 체험판을 단발 화면이 아니라 향후 식품제조·공장형 전자확인 업종팩으로 확장하기 위한 기준 문서다.

고객용 표현:
- ㈜리치코리아 현장 전자확인·피드백

내부 모듈명:
- SafeMetrica Food Factory Electronic Confirmation Module

본 모듈은 외부 전자서명 솔루션, 본인인증 API, 법적 전자서명 대체 서비스가 아니다. QR 기반 확인 흐름에서 작업 전 위생·안전 확인, 의견 제출, 관리자 검토, 주간 요약 후보를 운영기록으로 남기는 체험판 모듈이다.

## 2. tenant 기준

리치코리아는 신규업체 기준이므로 Supabase/PostgreSQL-first 체험판으로 운영한다.

기준값:
- company_code = richi
- service_mode = food_factory_e_confirmation_trial
- plan_type = trial

활성 모듈 후보:
- worker_qr_e_confirmation
- quick_feedback
- manager_inbox
- weekly_trial_summary_candidate

리치코리아 체험판은 Notion Companies DB 중심으로 세팅하지 않는다. 기존 고객용 legacy Notion bridge와 분리한다.

## 3. 근로자 QR 흐름 v1

근로자 흐름:
- QR 접속
- 작업 전 위생·안전 안내 확인
- 확인 항목 체크
- 의견 없음 또는 의견 제출
- 제출자 식별정보 입력
- 필요 시 사진 첨부
- 모바일 자필 확인서명
- 전자확인 제출
- 저장 완료 안내

근로자 화면은 30초 모바일 UX를 우선한다.

화면 원칙:
- 큰 버튼
- 짧은 문장
- 화이트 기반 카드
- 딥네이비 제목
- 세이프티 틸 또는 그린 포인트
- 긴 법률 문구보다 현장 확인 문구 우선

## 4. 관리자 샘플 흐름 v1

관리자 샘플 흐름:
- 전자확인 기록 확인
- 의견·불편사항 확인
- 관리자 확인 필요 항목 분리
- 주간 요약 후보 확인

체험판 관리자 화면에는 다음 항목을 노출하지 않는다.
- Owner Console
- Supabase 원본 DB
- 내부 API 경로
- 토큰
- 환경변수
- 실제 고객 민감정보

## 5. 주간 요약 후보 기준

주간 요약 후보는 최종 판단이 아니라 관리자 검토용 후보다.

사용 가능한 표현:
- 주간 요약 후보
- 관리자 검토 후보
- 관리자 확인 후 개선 검토 자료로 활용

금지 표현:
- 자동 조치완료
- 법적 판단 완료
- 개선 필요 확정
- 책임 면제

## 6. 모바일 자필 확인서명 v1 기준

현재 v1 상태:
- 근로자가 Step 3에서 하단 서명창을 열 수 있다.
- 손가락으로 모바일 자필 확인서명을 남길 수 있다.
- 서명 완료 후 작은 미리보기 카드가 남는다.
- 전자확인 제출 후 저장 완료 화면으로 이동한다.
- Supabase field_participation_submissions에 tenant_code=richi 저장이 확인되었다.
- notion_page_id와 notion_url은 null로 유지되어 Supabase-first 체험판 방향은 정상이다.

현재 v1 한계:
- 실제 서명 이미지와 확인내용 snapshot은 아직 완전한 증빙 저장 구조로 완성되지 않았다.
- 현재 상태를 “자필서명 이미지 저장 완료”라고 표현하지 않는다.
- 현재 기능을 “법적 전자서명 솔루션”으로 표현하지 않는다.

사용 가능한 표현:
- 모바일 자필 확인서명
- QR 기반 내부 확인기록
- 회사 내부 확인기록

금지 표현:
- 전자서명 솔루션
- 본인인증 완료
- 외부 인증서 기반 서명
- 법적 효력 보장
- 종이서명 완전 대체

## 7. 모바일 자필 확인서명 v2 백로그

정식 운영형에서는 자필서명 이미지를 raw_payload에 base64로 직접 저장하지 않는다.

권장 구조:
1. 서명 이미지는 Supabase Storage private bucket 또는 Vercel Blob에 저장한다.
2. field_participation_submissions.raw_payload에는 원본 이미지가 아니라 참조 메타데이터만 저장한다.
3. evidence_items에 signature evidence metadata를 생성한다.
4. 관리자 화면에서 제출자, 제출시각, 확인내용 snapshot, 서명 미리보기를 확인한다.
5. 고객용 Export에는 private storage path 또는 원본 signed URL을 직접 노출하지 않는다.

v2 후보 필드:
- signature_storage_path
- signature_evidence_id
- signature_signed_at
- signature_method
- signature_source_route
- signature_user_agent
- signature_snapshot_id

## 8. Supabase 원장 기준

리치 체험판 v1의 기본 저장 대상:
- field_participation_submissions

리치 체험판에서 정상으로 보는 상태:
- tenant_code = richi
- company_name = 리치코리아
- notion_page_id = null
- notion_url = null

## 9. Food Factory Confirmation Pack 확장 후보

향후 업종팩 확장 후보:
- 작업 전 위생·안전 확인
- 세척도구 위치·상태 확인
- 이물혼입 예방 확인
- 손세척·위생복·장갑 착용 확인
- 원료 보관 상태 확인
- 냉장·냉동 온도 확인 후보
- 포장실 동선 개선 의견
- 사진 첨부
- 관리자 검토 상태
- 주간 요약 후보
- 고객용 Export

HACCP 인증 보장, 법적 효력 보장, 인증 대체 표현은 사용하지 않는다.

## 10. UI polish 백로그

현재 체험판은 동작하지만 정식 상품형 UX로는 추가 정리가 필요하다.

우선순위:
1. 작업 전 안내문 축소
2. Step 3 입력 화면 여백 정리
3. 사진 첨부 카드 축소
4. 모바일 자필 확인서명 카드 고급화
5. 제출 완료 화면 문구 축소
6. 관리자 샘플과 주간 요약 샘플 톤 통일

## 11. 운영 원칙

SafeMetrica는 법적 판단자나 조치 확정자가 아니다. AI는 후보 제안자이며 최종 판단과 조치 여부는 관리자와 사업주가 확인한다.

본 모듈은 위생·안전 확인과 현장 의견 흐름을 운영기록으로 남기는 체험판 모듈이다.
