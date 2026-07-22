import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const foundationPath = "supabase/migrations/20260722020000_add_product_entitlement_foundation.sql";
const correctivePath = "supabase/migrations/20260722030000_harden_entitlement_event_composite_identity.sql";
const foundation = read(foundationPath);
const corrective = read(correctivePath);
const publicGuard = read("src/lib/risk-share/riskSharePublicTenantGuard.ts");
const sourceUpload = read("src/lib/risk-share/riskShareSourceUpload.ts");

const compact = (sql) => sql.replace(/--.*$/gm, " ").replace(/\s+/g, " ").trim().toLowerCase();
const sql = compact(corrective);

const checks = [
  ["corrective migration follows the merged foundation",
    correctivePath > foundationPath],
  ["entitlement exposes the complete event identity as a candidate key",
    /unique \(id, tenant_id, tenant_code, product_code\)/.test(sql)],
  ["event identity uses one composite foreign key",
    /foreign key \(entitlement_id, tenant_id, tenant_code, product_code\) references public\.tenant_product_entitlements \(id, tenant_id, tenant_code, product_code\) on delete restrict/.test(sql)],
  ["weaker entitlement-only foreign key is removed by exact name",
    /drop constraint tenant_product_entitlement_events_entitlement_fk/.test(sql)
      && /constraint tenant_product_entitlement_events_entitlement_fk\s+foreign key \(entitlement_id\)/s.test(compact(foundation))],
  ["tenant registry composite identity remains enforced",
    /foreign key \(tenant_id, tenant_code\) references public\.tenant_registry \(id, company_code\) on delete restrict/.test(compact(foundation))],
  ["RLS and service-role-only grants remain intact",
    (foundation.match(/enable row level security/g) ?? []).length === 2
      && (foundation.match(/from public, anon, authenticated, service_role/g) ?? []).length === 2
      && /grant select, insert[\s\S]*tenant_product_entitlement_events[\s\S]*to service_role/.test(foundation)],
  ["corrective migration contains no row mutation or runtime switch",
    !/(^|;)\s*(insert\s+into|update\s+public\.|delete\s+from|truncate\s+)/.test(sql)
      && !/tenant_product_entitlements/.test(publicGuard)
      && !/tenant_product_entitlements/.test(sourceUpload)],
];

const entitlement = {
  id: "entitlement-a",
  tenant_id: "tenant-a",
  tenant_code: "tenant-a-code",
  product_code: "risk_share",
};
const matchesCompositeIdentity = (event) =>
  ["entitlement_id", "tenant_id", "tenant_code", "product_code"].every((key) => {
    const entitlementKey = key === "entitlement_id" ? "id" : key;
    return event[key] === entitlement[entitlementKey];
  });

const cases = [
  ["same entitlement identity and normal state transition", { entitlement_id: "entitlement-a", tenant_id: "tenant-a", tenant_code: "tenant-a-code", product_code: "risk_share", from_status: "pending", to_status: "active" }, true],
  ["different tenant_id", { entitlement_id: "entitlement-a", tenant_id: "tenant-b", tenant_code: "tenant-a-code", product_code: "risk_share" }, false],
  ["different tenant_code", { entitlement_id: "entitlement-a", tenant_id: "tenant-a", tenant_code: "tenant-b-code", product_code: "risk_share" }, false],
  ["different product_code", { entitlement_id: "entitlement-a", tenant_id: "tenant-a", tenant_code: "tenant-a-code", product_code: "substituted_product" }, false],
  ["unknown entitlement_id", { entitlement_id: "missing", tenant_id: "tenant-a", tenant_code: "tenant-a-code", product_code: "risk_share" }, false],
  ["unknown tenant identity", { entitlement_id: "entitlement-a", tenant_id: "missing-tenant", tenant_code: "missing-code", product_code: "risk_share" }, false],
  ["cross-tenant injection", { entitlement_id: "entitlement-a", tenant_id: "tenant-b", tenant_code: "tenant-b-code", product_code: "risk_share" }, false],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
for (const [name, event, expected] of cases) {
  const ok = matchesCompositeIdentity(event) === expected;
  console.log(`${ok ? "PASS" : "FAIL"} ${expected ? "accept" : "reject"} ${name}`);
  checks.push([name, ok]);
}

assert.equal(checks.some(([, ok]) => !ok), false, "entitlement composite identity contract failed");
console.log("PASS entitlement event composite identity contract");
