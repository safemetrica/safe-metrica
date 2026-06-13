# SafeMetrica Evidence Items & Storage Bucket Strategy v1

* 기준일: 2026-06-13
* 문서 성격: 사진·파일 증빙 저장 구조 및 Supabase Storage 운영 기준
* 적용 범위: 신규 고객, Risk Share Pack, Full SafeMetrica, TBM, 현장참여, 근로자대표 확인, 월간보고서, 고객 Export
* 주의: 본 문서는 법적 판단, 면책, 처벌 방지, 무재해 보장 문서가 아니다.

## 1. 목적

이 문서는 SafeMetrica의 사진·파일 증빙을 Supabase-first 구조로 저장하기 위한 기준을 정의한다.

SafeMetrica에서 사진과 파일은 단순 첨부물이 아니라 다음 운영기록과 연결되는 증빙 자산이다.

* TBM 참석·작업 전·작업 중·특이사항 사진
* 위험제보·아차사고·개선제안 사진
* 조치 전·조치 후 사진
* 위험성평가 공유확인 관련 증빙
* 근로자대표 참여확인 관련 보완자료
* 월간보고서 및 고객용 Export에 포함될 증빙목록

핵심 원칙은 사진 원본은 Supabase Storage에 저장하고, DB에는 증빙 메타데이터와 연결 정보만 저장하는 것이다.

## 2. 기본 원칙

1. 사진 원본은 DB에 직접 저장하지 않는다.
2. 사진 원본은 Supabase Storage private bucket에 저장한다.
3. DB에는 evidence_items 테이블로 메타데이터를 저장한다.
4. 고객 화면에 public URL을 직접 노출하지 않는다.
5. 필요한 경우 signed URL 또는 서버 프록시를 사용한다.
6. 파일명에 고객명, 근로자명, 전화번호, 주민번호, 차량번호 등 민감정보를 직접 넣지 않는다.
7. EXIF 위치정보는 원칙적으로 제거하거나 별도 검토 후 저장한다.
8. 고객용 Export는 Storage 원본을 그대로 노출하지 않고 manifest 기준으로 구성한다.
9. 사진 증빙은 조치완료 확정이나 법적 판단이 아니라 운영 확인 자료로 표현한다.

## 3. Storage bucket 기준

### 3.1 bucket 후보

기본 bucket 후보:

```text
safemetrica-evidence
```

초기에는 단일 private bucket으로 운영한다.

장기적으로 고객 수와 데이터량이 증가하면 다음 방식도 검토한다.

* service-mode별 bucket 분리
* 보존기간별 bucket 분리
* 고객 대량 Export용 임시 bucket 분리
* archive bucket 분리

### 3.2 bucket 공개 여부

기본값:

```text
private
```

금지:

* public bucket에 고객 증빙사진 저장
* public URL을 고객 화면 또는 Export에 직접 포함
* 사진 경로에 토큰 또는 Owner 정보를 포함

허용:

* 서버 API가 권한 확인 후 signed URL 발급
* Owner Console에서 내부 확인용 signed URL 발급
* 고객 Export ZIP 생성 시 서버가 파일을 읽어 재구성
* 월간보고서 PDF에 필요한 경우 정제된 이미지 또는 썸네일 포함

## 4. Storage path 기준

Storage path는 운영 추적과 Export 재구성을 고려해 표준화한다.

기본 path 후보:

```text
evidence/{company_code}/{yyyy}/{mm}/{source_type}/{source_id}/{evidence_id}_{safe_file_name}
```

예시:

```text
evidence/hankookgreen/2026/06/tbm_voice/01HX.../ev_01HX_photo1.jpg
evidence/woogwang/2026/06/field_participation/01HY.../ev_01HY_before.jpg
```

### 4.1 path 구성 원칙

* company_code를 포함한다.
* 연도와 월을 포함한다.
* source_type을 포함한다.
* source_id를 포함한다.
* evidence_id를 포함한다.
* 파일명은 safe_file_name으로 정제한다.
* 파일명에 개인정보 또는 고객 민감정보를 넣지 않는다.

### 4.2 source_type 후보

* tbm_voice
* field_participation
* worker_share_confirmation
* worker_representative_confirmation
* risk_assessment
* monthly_report
* owner_upload
* export_package
* other

## 5. evidence_items 논리 schema

`evidence_items`는 사진·파일 증빙 메타데이터 원장이다.

### 5.1 주요 컬럼 후보

| 컬럼                     | 타입 후보       | 필수 | 설명                               |
| ---------------------- | ----------- | -: | -------------------------------- |
| evidence_id            | uuid        |  예 | 증빙 내부 식별자                        |
| company_id             | uuid        |  예 | companies 연결                     |
| company_code           | text        |  예 | 조회·Export 편의용 회사코드               |
| site_id                | uuid        | 선택 | sites 연결                         |
| source_type            | text        |  예 | 어떤 기능에서 생성된 증빙인지                 |
| source_id              | text        |  예 | 연결 원장의 식별자                       |
| evidence_type          | text        |  예 | 증빙 유형                            |
| storage_bucket         | text        |  예 | Supabase Storage bucket          |
| storage_path           | text        |  예 | Storage 내 파일 경로                  |
| original_file_name     | text        | 선택 | 업로드 원본 파일명                       |
| safe_file_name         | text        |  예 | 정제된 파일명                          |
| mime_type              | text        |  예 | 파일 MIME 타입                       |
| file_size              | bigint      | 선택 | 파일 크기                            |
| uploaded_by_role       | text        | 선택 | worker, manager, owner, system 등 |
| uploaded_at            | timestamptz |  예 | 업로드 시각                           |
| captured_at            | timestamptz | 선택 | 촬영 시각                            |
| exif_removed           | boolean     |  예 | EXIF 제거 여부                       |
| is_customer_exportable | boolean     |  예 | 고객 Export 포함 가능 여부               |
| retention_status       | text        |  예 | 보존 상태                            |
| export_manifest_status | text        | 선택 | Export manifest 포함 상태            |
| created_at             | timestamptz |  예 | 생성 시각                            |
| updated_at             | timestamptz |  예 | 수정 시각                            |

## 6. evidence_type 기준

증빙 유형 후보:

* tbm_attendance
* tbm_before_work
* tbm_work_scene
* tbm_special_issue
* report_photo
* near_miss_photo
* improvement_photo
* action_before
* action_after
* risk_share_attachment
* representative_attachment
* monthly_report_attachment
* other

### 6.1 TBM 사진 분류

TBM 사진은 다음 그룹으로 분리한다.

* 참석·서명 사진
* 작업 전 안전활동 사진
* 작업 대상·작업장 사진
* 특이사항·조치 사진
* 기타 증빙사진

이 분류는 월간보고서와 증빙목록 Export에 반영한다.

### 6.2 현장참여 사진 분류

현장참여 사진은 다음 성격으로 분리한다.

* 위험제보 사진
* 아차사고 사진
* 개선제안 사진
* 조치 전 사진
* 조치 후 사진
* 기타 참고 사진

사진만으로 조치완료를 확정하지 않는다. 조치상태는 관리자 검토와 조치메모를 함께 확인한다.

## 7. 업로드 흐름

기본 업로드 흐름:

```text
사용자 사진 선택
→ 서버 API 업로드 요청
→ 파일명 정제
→ MIME/type/size 검증
→ EXIF 제거 또는 검토
→ Supabase Storage private bucket 저장
→ evidence_items 메타데이터 저장
→ source 원장과 연결
→ 월간보고서·Export 후보 반영
```

클라이언트에서 service role을 사용하지 않는다.

## 8. 파일 검증 기준

허용 파일 후보:

* image/jpeg
* image/png
* image/webp
* application/pdf

초기에는 사진 중심으로 제한한다.

권장 제한:

* 파일 1개 최대 크기: 확인 필요
* 1회 업로드 최대 개수: 확인 필요
* 사업장 월간 총 저장량: 확인 필요
* PDF 허용 범위: 별도 검토

확인 필요 항목은 실제 Supabase 요금제, Storage 제한, 고객별 사용량을 보고 확정한다.

## 9. EXIF 및 개인정보 기준

사진에는 위치정보, 촬영기기 정보, 촬영시간 등 EXIF 데이터가 포함될 수 있다.

기본 원칙:

1. 위치정보는 원칙적으로 제거한다.
2. 촬영시간은 운영상 필요한 경우 별도 메타데이터로 관리한다.
3. 얼굴, 차량번호, 전화번호, 주민번호 등 민감정보가 포함된 사진은 고객 Export 전에 검토한다.
4. AI 분석 또는 썸네일 생성 시 원본을 외부 서비스에 무단 전송하지 않는다.
5. 고객에게 전달되는 파일명에는 개인정보를 넣지 않는다.

## 10. signed URL 기준

사진 조회는 public URL이 아니라 signed URL 또는 서버 프록시를 기준으로 한다.

signed URL 사용 원칙:

* 짧은 만료시간 설정
* 사용자 권한 또는 Owner 권한 확인 후 발급
* 고객별 company_code 또는 company_id 필터 확인
* Export용 장기 공개 링크 생성 금지

서버 프록시 사용 후보:

* Owner Console 미리보기
* 월간보고서 이미지 포함
* 고객 Export ZIP 생성
* 모바일 현장관리자 확인 화면

## 11. 고객용 Export 기준

고객용 Export에는 사진 원본 링크를 직접 넣지 않는다.

제공 가능 산출물:

* 증빙목록 CSV
* 증빙 ZIP
* 월간보고서 PDF
* 증빙 manifest

### 11.1 증빙목록 CSV 컬럼 후보

* 증빙번호
* 회사코드
* 현장명
* 관련 기록 유형
* 관련 기록일
* 증빙 유형
* 파일 유형
* 고객용 파일명
* Export 포함 여부
* 비고

제외 항목:

* Supabase 내부 UUID
* storage_path 원문
* signed URL
* raw_payload
* snapshot
* Owner 링크
* token
* service role
* 내부 API 경로

### 11.2 증빙 ZIP 기준

ZIP path 후보:

```text
evidence/{yyyy-mm}/{source_type}/{customer_safe_file_name}
```

고객용 ZIP에는 내부 Storage path를 그대로 노출하지 않는다.

## 12. 보존·삭제 기준

보존 상태 후보:

* active
* archived
* deleted_requested
* deleted
* export_only

삭제 원칙:

* 운영 기록은 삭제보다 상태 변경을 우선한다.
* 테스트 파일은 삭제 가능하다.
* 고객 요청 삭제는 별도 검토 후 처리한다.
* 삭제된 파일은 evidence_items에 이력을 남기는 구조를 검토한다.
* 실제 파일 삭제와 메타데이터 상태 변경은 분리한다.

## 13. 감사이력 연결

사진·증빙 관련 audit_events 후보:

* evidence_uploaded
* evidence_exported
* evidence_archived
* evidence_delete_requested
* evidence_deleted
* evidence_viewed_by_owner
* evidence_signed_url_issued

감사이력은 운영 확인 이력이다. 법적 판단 또는 면책 확정 이력으로 표현하지 않는다.

## 14. RLS 및 접근통제 기준

기본 기준:

1. Storage bucket은 private.
2. evidence_items는 RLS 활성화.
3. client direct select/insert는 제한.
4. server-only API가 업로드와 조회를 담당.
5. service role은 서버에서만 사용.
6. Owner API는 Owner 인증 후 사용.
7. 외부 고객 또는 근로자는 필요한 최소 정보만 조회.

금지:

* client에 service role 노출
* 고객에게 storage_path 원문 제공
* public bucket으로 증빙 운영
* linkId 없이 원본 파일 접근 허용
* 다른 company_code 파일 조회 가능 구조

## 15. 월간보고서 연결

월간보고서에는 다음 정보를 반영한다.

* TBM 증빙 수
* 현장참여 증빙 수
* 조치 전·후 증빙 수
* 증빙 보완 필요 항목
* Export 가능 증빙 수
* 증빙목록 다운로드 후보

월간보고서 표현 기준:

* “증빙 보완 필요”
* “관리자 확인 필요”
* “사진 첨부됨”
* “Export 후보”

사용하지 않는 표현:

* 사진으로 조치완료 확정
* 사진으로 법적 요건 충족
* 사진으로 면책 보장

## 16. 후속 PR 후보

1. evidence_items 실제 Supabase migration v1
2. Supabase Storage private bucket 생성 절차 문서
3. signed URL 발급 API 설계
4. TBM 사진 Storage 저장 전환
5. 현장참여 사진 Storage 저장 전환
6. 증빙목록 CSV Export 고도화
7. 증빙 ZIP Export 설계
8. EXIF 제거 전략 검토
