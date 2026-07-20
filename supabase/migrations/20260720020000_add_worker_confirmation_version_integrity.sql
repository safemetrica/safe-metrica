-- SafeMetrica Commercial Core: worker confirmation Version integrity
--
-- Additive-only linkage for SaaS risk-share monthly confirmations.
-- Existing rows are preserved and are not backfilled or deleted.
-- Legacy field participation routes remain nullable and unaffected.

alter table public.field_participation_submissions
  add column if not exists version_lock_id uuid;

alter table public.field_participation_submissions
  add column if not exists confirmed_share_item_ids uuid[];

alter table public.field_participation_submissions
  add column if not exists confirmation_idempotency_key text;

alter table public.field_participation_submissions
  add column if not exists confirmation_request_digest text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'field_participation_version_tenant_fkey'
  ) then
    alter table public.field_participation_submissions
      add constraint field_participation_version_tenant_fkey
      foreign key (version_lock_id, tenant_code)
      references public.risk_share_version_locks (id, company_code)
      match simple
      on delete restrict;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'field_participation_confirmation_pair_check'
  ) then
    alter table public.field_participation_submissions
      add constraint field_participation_confirmation_pair_check
      check (
        (
          version_lock_id is null
          and confirmed_share_item_ids is null
          and confirmation_idempotency_key is null
          and confirmation_request_digest is null
        )
        or
        (
          version_lock_id is not null
          and confirmed_share_item_ids is not null
          and cardinality(confirmed_share_item_ids) between 1 and 100
          and array_position(confirmed_share_item_ids, null) is null
          and confirmation_idempotency_key = btrim(confirmation_idempotency_key)
          and confirmation_idempotency_key <> ''
          and char_length(confirmation_idempotency_key) <= 200
          and confirmation_request_digest ~ '^[0-9a-f]{64}$'
        )
      );
  end if;
end
$$;

do $
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'field_participation_tenant_confirmation_idempotency_key'
  ) then
    alter table public.field_participation_submissions
      add constraint field_participation_tenant_confirmation_idempotency_key
      unique (tenant_code, confirmation_idempotency_key);
  end if;
end
$;

create index if not exists
  field_participation_tenant_version_created_idx
  on public.field_participation_submissions (
    tenant_code,
    version_lock_id,
    created_at desc
  )
  where version_lock_id is not null;

comment on column public.field_participation_submissions.version_lock_id is
  'Immutable risk_share_version_locks row shown to and confirmed by the worker. Nullable for legacy and non-monthly submissions. Tenant equality is enforced by field_participation_version_tenant_fkey.';

comment on column public.field_participation_submissions.confirmed_share_item_ids is
  'Canonical source_item_id set from the immutable risk_share_version_items snapshot confirmed by the worker.';

comment on column public.field_participation_submissions.confirmation_idempotency_key is
  'Browser-generated retry identity for one monthly Version confirmation, unique per tenant when present.';

comment on column public.field_participation_submissions.confirmation_request_digest is
  'SHA-256 digest of the validated Version confirmation request, excluding storage path details, used to distinguish exact replay from idempotency conflict.';
