create table public.worker_representative_confirmation_links (
  link_id uuid primary key,
  related_company_code text not null,
  related_site_name text not null,
  confirmation_scope text not null,
  related_risk_assessment_id text,
  status text not null default 'active',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  constraint worker_representative_confirmation_links_company_check check (
    nullif(btrim(related_company_code), '') is not null
  ),
  constraint worker_representative_confirmation_links_site_check check (
    nullif(btrim(related_site_name), '') is not null
  ),
  constraint worker_representative_confirmation_links_scope_check check (
    nullif(btrim(confirmation_scope), '') is not null
  ),
  constraint worker_representative_confirmation_links_status_check check (
    status in ('active', 'revoked')
  )
);

comment on table public.worker_representative_confirmation_links is
  '근로자대표 참여확인 외부 공유 링크의 서버 전용 원장';

comment on column public.worker_representative_confirmation_links.link_id is
  '외부 공유 URL에 사용하는 링크 식별자';
comment on column public.worker_representative_confirmation_links.related_company_code is
  '링크를 생성한 업체 코드';
comment on column public.worker_representative_confirmation_links.related_site_name is
  '링크에 고정된 현장명';
comment on column public.worker_representative_confirmation_links.confirmation_scope is
  '링크에 고정된 참여확인 범위';
comment on column public.worker_representative_confirmation_links.related_risk_assessment_id is
  '링크와 연결된 위험성평가 식별자';
comment on column public.worker_representative_confirmation_links.status is
  '링크 사용 상태';
comment on column public.worker_representative_confirmation_links.expires_at is
  '링크 만료 시각';
comment on column public.worker_representative_confirmation_links.created_at is
  '링크 생성 시각';
comment on column public.worker_representative_confirmation_links.last_used_at is
  '서버가 링크를 마지막으로 조회한 시각';

create index worker_representative_confirmation_links_company_created_at_idx
  on public.worker_representative_confirmation_links (
    related_company_code,
    created_at desc
  );

create index worker_representative_confirmation_links_status_expires_at_idx
  on public.worker_representative_confirmation_links (
    status,
    expires_at
  );

alter table public.worker_representative_confirmation_links enable row level security;

-- 서버 service role adapter만 이 원장을 읽고 쓴다.
-- anon/authenticated 역할을 위한 직접 insert/update/select 정책은 추가하지 않는다.
