# SafeMetrica Risk Share Source File Security Policy v1

작업명: `docs: define risk share source file security policy v1`

기준일: 2026-06-14

## 1. 목적

이 문서는 Risk Share Pack Source File Intake에서 고객이 제공한 위험성평가표, 평가결과지, PDF, Excel, 이미지 자료를 어떻게 보관하고 접근 통제할지 잠그기 위한 기준 문서다.

Source File Intake v1은 파일 업로드와 `risk_share_sources` 메타데이터 저장까지 가능해졌다.

다만 현재 구현은 Vercel Blob public URL 구조이므로 실제 고객 원본 파일을 장기 운영 기준으로 저장하기에는 보안 검토가 필요하다.

## 2. 현재 상태

현재 가능한 것:

- Owner 전용 Source File Intake 화면
- 위험성평가 source 파일 업로드
- Vercel Blob 저장
- Supabase `risk_share_sources` 메타데이터 저장
- 업로드 성공 후 metadata 저장 실패 시 Blob rollback
- raw text / AI extraction / review status pending 관리

현재 한계:

- Blob URL이 public 접근 구조다.
- URL이 유출되면 원본 파일 접근 가능성이 있다.
- 실제 고객 원본 위험성평가표를 장기 저장할 보안 기준이 아직 완성되지 않았다.
- source 원본 파일 삭제, 만료, 다운로드 로그 기준이 아직 없다.

## 3. 원칙

고객 위험성평가 원본 파일은 민감 운영자료로 본다.

금지:

- GitHub 저장
- 공개 문서 저장
- 채팅에 원본 내용 붙여넣기
- 토큰 포함 URL 공유
- Owner Token, API Key, service role, 환경변수 값 노출
- 고객 민감 원문을 제안서 또는 캡처에 포함

허용:

- Owner 전용 화면에서 접수
- Storage 또는 Blob에 원본 파일 저장
- Supabase에는 source metadata만 저장
- AI 추출 결과는 후보로 저장
- 운영자 검토 후 고객 확인 단계로 이동

## 4. 저장소 방향

### v1 현재

- 원본 파일: Vercel Blob public URL
- 메타데이터: Supabase `risk_share_sources`
- 상태: raw_text_status / extraction_status / review_status pending

v1은 기능 검증과 내부 테스트에는 사용할 수 있다.

실제 고객 원본 운영에는 제한적으로 사용하며, 외부 공유를 금지한다.

### 권장 v2

Supabase Storage private bucket + signed URL 구조로 전환한다.

권장 이유:

- Supabase 원장과 source 파일 권한 기준을 맞출 수 있다.
- 고객별 접근통제와 만료 URL 관리가 가능하다.
- source metadata, AI candidates, version lock, worker signals를 같은 원장 기준으로 연결하기 쉽다.

## 5. 접근통제 기준

원본 source 파일 접근 권한:

- Owner / 내부 운영자만 접근
- 고객 관리자 접근은 후속 정책 확정 후 제한적으로 허용
- 근로자 화면에는 원본 source 파일 URL을 노출하지 않음
- 근로자에게는 locked share item 요약만 표시

노출 가능 항목:

- 작업명
- 위험요인 요약
- 사고유형
- 확인할 안전조치
- 위험등급 또는 주의수준
- 공유확인 / 제보 / 아차사고 / 개선제안 진입

노출 금지 항목:

- 원본 위험성평가표 전체
- source file URL
- 내부 메모
- raw_payload
- internal UUID
- service role
- Owner Token
- API Key
- 환경변수 값

## 6. 삭제 및 rollback 기준

필수 기준:

- Blob 업로드 후 metadata 저장 실패 시 업로드 파일 자동 삭제
- 테스트 source는 DB row와 Blob 파일을 함께 삭제
- 실제 고객 계약 종료 시 source 원본 보관 / 삭제 / Export 범위를 계약 기준으로 확인
- 삭제 전 고객 제공 범위와 내부 운영 필요성을 확인

이미 적용된 보완:

- metadata 저장 실패 시 uploaded Blob rollback 처리

추가 필요:

- Owner 화면에서 source row 삭제 시 Blob도 함께 삭제
- 삭제 로그 저장
- 다운로드 로그 저장
- signed URL 만료 기준

## 7. AI 추출 기준

AI는 source 원본에서 위험요인 후보를 추출할 수 있다.

AI가 할 수 있는 것:

- 작업명 후보 추출
- 위험요인 후보 추출
- 사고유형 후보 추출
- 안전조치 후보 요약
- 공통 / 비공통 / 현장특이 / worker signal / 기타 분류 후보 제안
- 근로자용 쉬운 문장 후보 작성

AI가 하면 안 되는 것:

- 법적 적합성 확정
- 위험성평가 완료 판단
- 조치완료 확정
- 법적 의무 이행 보장
- 과태료 방지 보장
- 중대재해 면책
- 무재해 보장
- 위험성평가 대행 표현
- 안전관리대행 표현

## 8. 고객 배포 기준

고객에게 배포하는 것:

- QR 포스터
- 근로자 공유요약 링크
- 관리자 공유팩 홈 안내
- 월간요약
- 고객용 Export

고객에게 자동 공유하지 않는 것:

- source 원본 file URL
- Owner Console
- Supabase 원장 화면
- 내부 AI 추출 raw data
- 내부 검토 메모

## 9. 다음 개발 순서

1. `feat: add risk share item candidate schema v1`
2. `feat: add extracted candidate review UI v1`
3. `feat: persist accepted share items v1`
4. `feat: persist risk share version lock v1`
5. `feat: connect locked share items to worker risk summary`
6. `feat: generate QR poster from locked share version`
7. `feat: move source file storage to private signed-url policy`

## 10. 현재 결론

Source File Intake v1은 내부 테스트와 관리형 MVP 검증에 성공했다.

다만 실제 고객 원본 위험성평가표를 안정적으로 운영하려면 source file 보안 정책을 잠그고, 장기적으로 private storage + signed URL 구조로 전환해야 한다.

Risk Share Pack의 핵심 경쟁력은 단순 파일 보관이 아니라 source file에서 위험요인 후보를 추출하고, 운영자 검토와 고객 확인을 거쳐 근로자 공유 및 다음 위험성평가 재검토 후보로 축적하는 구조다.
