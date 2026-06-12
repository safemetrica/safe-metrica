create table public.worker_representative_confirmations (
  confirmation_id uuid primary key,
  related_company_code text not null,
  related_site_name text,
  related_risk_assessment_id text,
  confirmation_scope text,
  representative_name text not null,
  representative_department text,
  representative_role text not null,
  confirmed_at timestamptz not null,
  opinion text,
  has_objection boolean not null default false,
  objection_detail text,
  consent_checked boolean not null default false,
  consent_recorded_at timestamptz not null,
  client_submission_id text,
  review_status text not null default '미확인',
  submitted_at timestamptz not null default now(),
  audit_event_candidate jsonb,
  constraint worker_representative_confirmations_scope_check check (
    nullif(btrim(related_risk_assessment_id), '') is not null
    or nullif(btrim(confirmation_scope), '') is not null
  ),
  constraint worker_representative_confirmations_consent_check check (
    consent_checked is true
  ),
  constraint worker_representative_confirmations_objection_detail_check check (
    has_objection is false
    or nullif(btrim(objection_detail), '') is not null
  ),
  constraint worker_representative_confirmations_review_status_check check (
    review_status in (
      '미확인',
      '확인',
      '검토 필요',
      '이견 검토 중',
      '보완 요청',
      '검토 완료',
      '반려'
    )
  )
);

comment on table public.worker_representative_confirmations is
  '근로자대표 참여확인 전용 원장. 일반 현장참여 제출 원장과 혼합하지 않는다.';

comment on column public.worker_representative_confirmations.confirmation_id is
  '근로자대표 참여확인 기록 식별자';
comment on column public.worker_representative_confirmations.related_company_code is
  '참여확인과 연결된 업체 코드';
comment on column public.worker_representative_confirmations.related_site_name is
  '참여확인과 연결된 현장명';
comment on column public.worker_representative_confirmations.related_risk_assessment_id is
  '참여확인과 연결된 위험성평가 식별자';
comment on column public.worker_representative_confirmations.confirmation_scope is
  '위험성평가 식별자가 없을 때 참여확인 대상을 설명하는 범위';
comment on column public.worker_representative_confirmations.representative_name is
  '참여확인을 제출한 근로자대표 이름';
comment on column public.worker_representative_confirmations.representative_department is
  '참여확인을 제출한 근로자대표 부서';
comment on column public.worker_representative_confirmations.representative_role is
  '참여확인을 제출한 근로자대표 역할';
comment on column public.worker_representative_confirmations.confirmed_at is
  '근로자대표가 참여 내용을 확인한 시각';
comment on column public.worker_representative_confirmations.opinion is
  '근로자대표 의견';
comment on column public.worker_representative_confirmations.has_objection is
  '근로자대표 이견 존재 여부';
comment on column public.worker_representative_confirmations.objection_detail is
  '근로자대표 이견 상세 내용';
comment on column public.worker_representative_confirmations.consent_checked is
  '제출 시 필수 동의 확인 여부';
comment on column public.worker_representative_confirmations.consent_recorded_at is
  '필수 동의를 기록한 시각';
comment on column public.worker_representative_confirmations.client_submission_id is
  '클라이언트가 생성한 중복 제출 방지 식별자';
comment on column public.worker_representative_confirmations.review_status is
  '근로자대표 참여확인 검토 상태';
comment on column public.worker_representative_confirmations.submitted_at is
  '서버가 참여확인 제출을 접수한 시각';
comment on column public.worker_representative_confirmations.audit_event_candidate is
  '후속 감사 이벤트 생성을 위한 제출 시점 후보 데이터';

create unique index worker_representative_confirmations_company_client_submission_uidx
  on public.worker_representative_confirmations (
    related_company_code,
    client_submission_id
  )
  where client_submission_id is not null;

create index worker_representative_confirmations_company_idx
  on public.worker_representative_confirmations (related_company_code);

create index worker_representative_confirmations_company_submitted_at_idx
  on public.worker_representative_confirmations (
    related_company_code,
    submitted_at desc
  );

create index worker_representative_confirmations_company_review_status_idx
  on public.worker_representative_confirmations (
    related_company_code,
    review_status
  );

create index worker_representative_confirmations_company_risk_assessment_idx
  on public.worker_representative_confirmations (
    related_company_code,
    related_risk_assessment_id
  );

alter table public.worker_representative_confirmations enable row level security;

-- 이 migration은 서버 측 service role adapter 전용 저장소만 준비한다.
-- anon/authenticated 직접 insert 정책과 그 밖의 RLS 정책은 후속 권한 작업에서 정의한다.
