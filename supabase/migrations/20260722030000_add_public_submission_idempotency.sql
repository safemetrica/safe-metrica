-- Durable retry identity for public Risk Share submissions.
-- Additive only: existing rows remain nullable and unchanged.

alter table public.field_participation_submissions
  add column if not exists public_submission_kind text,
  add column if not exists public_idempotency_key text,
  add column if not exists public_request_digest text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'field_participation_public_retry_triplet_check'
  ) then
    alter table public.field_participation_submissions
      add constraint field_participation_public_retry_triplet_check
      check (
        (public_submission_kind is null and public_idempotency_key is null and public_request_digest is null)
        or
        (
          public_submission_kind in ('anonymous_feedback', 'visitor_confirmation', 'representative_confirmation')
          and public_idempotency_key = btrim(lower(public_idempotency_key))
          and public_idempotency_key ~ '^[0-9a-f-]{36}$'
          and public_request_digest ~ '^[0-9a-f]{64}$'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'field_participation_public_retry_key'
  ) then
    alter table public.field_participation_submissions
      add constraint field_participation_public_retry_key
      unique (tenant_code, public_submission_kind, public_idempotency_key);
  end if;
end $$;

comment on column public.field_participation_submissions.public_idempotency_key is
  'Browser-generated retry identity. Tenant and submission kind scope exact replay.';
comment on column public.field_participation_submissions.public_request_digest is
  'SHA-256 digest of the validated public submission payload; changed replay is rejected.';
