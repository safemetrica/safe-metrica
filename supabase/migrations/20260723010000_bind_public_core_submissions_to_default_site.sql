-- SafeMetrica Managed Commercial Core: bind new non-Version public
-- submissions to the tenant's canonical active default site.
--
-- This migration does not backfill or otherwise update existing NULL rows.

create or replace function public.bind_new_confirmation_to_version_site()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_site_id uuid;
begin
  if new.version_lock_id is null then
    if new.public_submission_kind in (
      'anonymous_feedback',
      'visitor_confirmation',
      'representative_confirmation'
    ) then
      select ts.id
        into v_site_id
      from public.tenant_registry tr
      join public.tenant_sites ts
        on ts.id = tr.default_site_id
       and ts.tenant_id = tr.id
       and ts.tenant_code = tr.company_code
       and ts.status = 'active'
       and ts.is_default = true
      where tr.company_code = new.tenant_code;

      if not found then
        raise exception using
          errcode = '23503',
          message = 'canonical active default site is required for public Core submission';
      end if;

      if new.site_id is not null and new.site_id <> v_site_id then
        raise exception using
          errcode = '23503',
          message = 'public Core submission site does not match canonical tenant default';
      end if;

      new.site_id := v_site_id;
      return new;
    end if;

    if new.site_id is not null then
      raise exception using
        errcode = '23514',
        message = 'site requires a version or supported public Core submission kind';
    end if;

    return new;
  end if;

  select vl.site_id
    into v_site_id
  from public.risk_share_version_locks vl
  where vl.id = new.version_lock_id
    and vl.company_code = new.tenant_code;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'tenant-matched version is required';
  end if;

  -- Legacy active Version confirmations remain NULL until an explicit transition.
  if v_site_id is null then
    if new.site_id is not null then
      raise exception using
        errcode = '23514',
        message = 'legacy version cannot accept a site';
    end if;

    return new;
  end if;

  if new.site_id is not null and new.site_id <> v_site_id then
    raise exception using
      errcode = '23503',
      message = 'confirmation site does not match version';
  end if;

  new.site_id := v_site_id;
  return new;
end
$$;

revoke all on function public.bind_new_confirmation_to_version_site() from public;
revoke execute on function public.bind_new_confirmation_to_version_site() from anon, authenticated;

comment on column public.field_participation_submissions.site_id is
  'Site inherited from a referenced site-bound Version or, for new supported non-Version public Core submissions, the canonical active default site. Existing legacy rows remain unchanged.';

-- Production preflight (read-only):
--   1. Confirm tenant_registry.default_site_id and tenant_sites exist.
--   2. Confirm field_participation_submissions has site_id,
--      public_submission_kind, and the existing trigger.
--   3. Confirm no unexpected EXECUTE grant exists on this function.
--
-- Production post-check (read-only):
--   1. Confirm the function remains SECURITY DEFINER with
--      search_path = public, pg_temp.
--   2. Confirm the existing trigger still calls this function.
--   3. Confirm PUBLIC, anon, and authenticated have no EXECUTE grant.
--   4. Rehearse synthetic inserts in a transaction and ROLLBACK.
--
-- Rollback definition (separate approval required):
--   Restore bind_new_confirmation_to_version_site() from
--   20260722010000_add_risk_share_site_binding_integrity.sql.
--   No row mutation is required because this migration changes only new writes.
