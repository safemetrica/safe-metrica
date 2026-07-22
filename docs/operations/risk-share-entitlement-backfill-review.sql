-- REVIEW-ONLY B2 artifact. Do not execute against Production without the
-- representative-approved manifest and a separate Production Gate.
begin;

create temporary table approved_risk_share_backfill (
  tenant_id uuid primary key,
  tenant_code text not null,
  status text not null,
  activation_source text not null,
  effective_at timestamptz not null,
  expires_at timestamptz,
  policy_version integer not null,
  actor_type text not null,
  idempotency_key text not null,
  request_digest text not null,
  external_reference text,
  unique (tenant_code, idempotency_key)
) on commit drop;

-- Insert only representative-approved manifest values here.

do $$
begin
  if not exists (select 1 from approved_risk_share_backfill) then
    raise exception 'approved_manifest_empty';
  end if;
  if exists (
    select 1
    from approved_risk_share_backfill i
    left join public.tenant_registry tr
      on tr.id = i.tenant_id and tr.company_code = i.tenant_code
    where tr.id is null or tr.status <> 'active' or i.status <> 'active'
      or i.activation_source not in ('owner_console','contract','payment_webhook','partner','complimentary')
      or i.policy_version < 1 or i.actor_type <> 'owner_console'
      or length(btrim(i.idempotency_key)) not between 1 and 200
      or i.request_digest !~ '^[0-9a-f]{64}$'
      or (i.expires_at is not null and i.expires_at <= i.effective_at)
  ) then raise exception 'backfill_input_invalid'; end if;
  if exists (
    select 1 from approved_risk_share_backfill i
    join public.tenant_product_entitlements e
      on e.tenant_id = i.tenant_id and e.product_code = 'risk_share'
    where e.tenant_code <> i.tenant_code or e.status <> i.status
      or e.activation_source <> i.activation_source
      or e.policy_version <> i.policy_version
      or e.effective_at is distinct from i.effective_at
      or e.expires_at is distinct from i.expires_at
      or e.external_reference is distinct from i.external_reference
  ) then raise exception 'existing_entitlement_conflict'; end if;
  if exists (
    select 1 from approved_risk_share_backfill i
    join public.tenant_product_entitlement_events ev
      on ev.tenant_code = i.tenant_code and ev.product_code = 'risk_share'
      and ev.idempotency_key = i.idempotency_key
    where ev.request_digest <> i.request_digest or ev.to_status <> i.status
      or ev.activation_source <> i.activation_source
      or ev.policy_version <> i.policy_version or ev.actor_type <> i.actor_type
  ) then raise exception 'existing_event_idempotency_conflict'; end if;
end $$;

insert into public.tenant_product_entitlements
  (tenant_id,tenant_code,product_code,status,activation_source,policy_version,effective_at,expires_at,external_reference)
select tenant_id,tenant_code,'risk_share',status,activation_source,policy_version,effective_at,expires_at,external_reference
from approved_risk_share_backfill on conflict (tenant_id,product_code) do nothing;

insert into public.tenant_product_entitlement_events
  (entitlement_id,tenant_id,tenant_code,product_code,from_status,to_status,activation_source,policy_version,actor_type,idempotency_key,request_digest)
select e.id,i.tenant_id,i.tenant_code,'risk_share',null,i.status,i.activation_source,i.policy_version,i.actor_type,i.idempotency_key,i.request_digest
from approved_risk_share_backfill i
join public.tenant_product_entitlements e
  on e.tenant_id=i.tenant_id and e.tenant_code=i.tenant_code and e.product_code='risk_share'
on conflict (tenant_code,product_code,idempotency_key) do nothing;

do $$
declare expected_count bigint; entitlement_count bigint; event_count bigint;
begin
  select count(*) into expected_count from approved_risk_share_backfill;
  select count(*) into entitlement_count from approved_risk_share_backfill i
    join public.tenant_product_entitlements e on e.tenant_id=i.tenant_id and e.tenant_code=i.tenant_code and e.product_code='risk_share';
  select count(*) into event_count from approved_risk_share_backfill i
    join public.tenant_product_entitlement_events ev on ev.tenant_id=i.tenant_id and ev.tenant_code=i.tenant_code
      and ev.product_code='risk_share' and ev.idempotency_key=i.idempotency_key and ev.request_digest=i.request_digest;
  if expected_count <> entitlement_count or expected_count <> event_count then
    raise exception 'combined_backfill_verification_failed';
  end if;
end $$;

-- Mandatory dry-run end. A future approved execution must use a separately
-- reviewed artifact; this repository file intentionally cannot commit.
rollback;
