from pathlib import Path

migration_path = Path("supabase/migrations/20260720010000_add_tenant_risk_share_publish_revision_guard.sql")
verifier_path = Path("scripts/verify-risk-share-tenant-publish-revision-guard-contract.mjs")

migration = migration_path.read_text(encoding="utf-8")
verifier = verifier_path.read_text(encoding="utf-8")

if "p_expected_review_revisions bigint[]" in migration and "p_expected_review_revisions integer[]" not in migration:
    print("Approved PR #917 fixes already applied.")
    raise SystemExit(0)

if "p_expected_review_revisions integer[]" not in migration:
    raise SystemExit("expected integer[] checked signature not found")

migration = migration.replace("integer[]", "bigint[]")
verifier = verifier.replace("integer[]", "bigint[]")

marker = "-- Fail closed if an unexpected checked-RPC overload already exists.\n"
block = r"""-- Apply-time prerequisite validation against the actual database contract.
-- The checked RPC depends on the existing bigint review/snapshot ledgers and
-- on deterministic Owner/tenant Item row-lock parity. Fail before creating
-- the new function if any prerequisite is missing or has drifted.
do $$
declare
  v_item_revision_type oid;
  v_item_revision_not_null boolean;
  v_snapshot_revision_type oid;
  v_snapshot_revision_not_null boolean;
  v_owner_oid oid;
  v_owner_total_count integer;
  v_owner_definition text;
begin
  select a.atttypid, a.attnotnull
  into v_item_revision_type, v_item_revision_not_null
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'risk_share_items'
    and a.attname = 'review_revision'
    and a.attnum > 0
    and not a.attisdropped;

  if v_item_revision_type is distinct from 'bigint'::regtype::oid
     or v_item_revision_not_null is distinct from true then
    raise exception
      'publish_risk_share_version_for_tenant_checked prerequisite failed: risk_share_items.review_revision must be bigint NOT NULL';
  end if;

  select a.atttypid, a.attnotnull
  into v_snapshot_revision_type, v_snapshot_revision_not_null
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'risk_share_version_items'
    and a.attname = 'source_review_revision'
    and a.attnum > 0
    and not a.attisdropped;

  if v_snapshot_revision_type is distinct from 'bigint'::regtype::oid
     or v_snapshot_revision_not_null is distinct from true then
    raise exception
      'publish_risk_share_version_for_tenant_checked prerequisite failed: risk_share_version_items.source_review_revision must be bigint NOT NULL';
  end if;

  select count(*) into v_owner_total_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_risk_share_version_lock';

  v_owner_oid := to_regprocedure(
    'public.create_risk_share_version_lock(text,text,text,text,text,text,text,boolean,uuid[],text)'
  )::oid;

  if v_owner_total_count <> 1 or v_owner_oid is null then
    raise exception
      'publish_risk_share_version_for_tenant_checked prerequisite failed: Owner RPC overload/signature mismatch';
  end if;

  v_owner_definition := pg_get_functiondef(v_owner_oid);

  if v_owner_definition !~*
       'order by[[:space:]]+risk_share_items\.id[[:space:]]+asc[[:space:]]+for update of risk_share_items' then
    raise exception
      'publish_risk_share_version_for_tenant_checked prerequisite failed: Owner RPC Item lock order mismatch';
  end if;
end
$$;

"""
if block not in migration:
    if marker not in migration:
        raise SystemExit("checked overload marker not found")
    migration = migration.replace(marker, block + marker, 1)

checked_constant = (
    'const CHECKED_MIGRATION_FILE =\n'
    '  "supabase/migrations/20260720010000_add_tenant_risk_share_publish_revision_guard.sql";\n'
)
extra_constants = (
    'const REVIEW_CONTRACT_FILE =\n'
    '  "supabase/migrations/20260716010000_add_risk_share_item_review_contract.sql";\n'
    'const SNAPSHOT_FOUNDATION_FILE =\n'
    '  "supabase/migrations/20260717000000_add_risk_share_version_snapshot_foundation.sql";\n'
)
if extra_constants not in verifier:
    verifier = verifier.replace(checked_constant, extra_constants + checked_constant, 1)

verifier = verifier.replace(
    "  OWNER_CORRECTION_FILE,\n  CHECKED_MIGRATION_FILE,",
    "  OWNER_CORRECTION_FILE,\n  REVIEW_CONTRACT_FILE,\n  SNAPSHOT_FOUNDATION_FILE,\n  CHECKED_MIGRATION_FILE,",
    1,
)
verifier = verifier.replace(
    'const ownerSrc = fs.readFileSync(OWNER_CORRECTION_FILE, "utf8");\n'
    'const checkedSrc = fs.readFileSync(CHECKED_MIGRATION_FILE, "utf8");\n',
    'const ownerSrc = fs.readFileSync(OWNER_CORRECTION_FILE, "utf8");\n'
    'const reviewSrc = fs.readFileSync(REVIEW_CONTRACT_FILE, "utf8");\n'
    'const snapshotSrc = fs.readFileSync(SNAPSHOT_FOUNDATION_FILE, "utf8");\n'
    'const checkedSrc = fs.readFileSync(CHECKED_MIGRATION_FILE, "utf8");\n',
    1,
)

section = "// B. SECURITY DEFINER and tenant boundary.\n"
checks = r'''// A1. Actual revision-ledger and Owner prerequisites.
check(
  "canonical review revision SSOT is bigint",
  reviewSrc.includes(
    "add column if not exists review_revision bigint not null default 1;",
  ) && reviewSrc.includes("p_expected_revision bigint"),
);
check(
  "canonical snapshot revision SSOT is bigint NOT NULL",
  snapshotSrc.includes("source_review_revision bigint not null"),
);
check(
  "checked RPC uses bigint revision arrays end-to-end",
  checkedSrc.includes("p_expected_review_revisions bigint[]") &&
    checkedSrc.includes("v_expected_review_revisions bigint[]") &&
    checkedSrc.includes("v_stored_review_revisions bigint[]") &&
    checkedSrc.includes("v_replay_live_review_revisions bigint[]") &&
    checkedSrc.includes("v_eligible_review_revisions bigint[]") &&
    checkedSrc.includes("v_final_snapshot_review_revisions bigint[]") &&
    checkedSrc.includes("v_final_live_review_revisions bigint[]") &&
    checkedSrc.includes("'{}'::bigint[]") &&
    !checkedSrc.includes("integer[]"),
);
check(
  "checked migration validates actual bigint NOT NULL revision columns",
  checkedSrc.includes("from pg_attribute a") &&
    checkedSrc.includes("c.relname = 'risk_share_items'") &&
    checkedSrc.includes("a.attname = 'review_revision'") &&
    checkedSrc.includes("c.relname = 'risk_share_version_items'") &&
    checkedSrc.includes("a.attname = 'source_review_revision'") &&
    checkedSrc.includes("is distinct from 'bigint'::regtype::oid") &&
    checkedSrc.includes("is distinct from true"),
);
check(
  "checked migration validates the exact live Owner RPC prerequisite",
  checkedSrc.includes(
    "public.create_risk_share_version_lock(text,text,text,text,text,text,text,boolean,uuid[],text)",
  ) &&
    checkedSrc.includes("v_owner_total_count <> 1") &&
    checkedSrc.includes("v_owner_oid is null") &&
    checkedSrc.includes("v_owner_definition := pg_get_functiondef(v_owner_oid)") &&
    checkedSrc.includes(
      "risk_share_items\\.id[[:space:]]+asc[[:space:]]+for update of risk_share_items",
    ),
);

'''
if checks not in verifier:
    verifier = verifier.replace(section, checks + section, 1)

large_marker = '''check(
  "mirror rejects non-positive revisions",
  canonicalizePairs(["item-a"], [0]) === null,
);
'''
large_check = '''check(
  "mirror preserves a revision above the int4 maximum",
  JSON.stringify(canonicalizePairs(["item-a"], [2147483648])) ===
    JSON.stringify({ itemIds: ["item-a"], expectedRevisions: [2147483648] }),
);
'''
if large_check not in verifier:
    verifier = verifier.replace(large_marker, large_marker + large_check, 1)

if "integer[]" in migration:
    raise SystemExit("integer[] remains in checked migration")
if "p_expected_review_revisions bigint[]" not in migration:
    raise SystemExit("bigint[] checked signature missing")
if "Owner RPC Item lock order mismatch" not in migration:
    raise SystemExit("Owner apply-time prerequisite missing")

migration_path.write_text(migration, encoding="utf-8")
verifier_path.write_text(verifier, encoding="utf-8")
