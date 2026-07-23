import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const page = read("src/app/risk-share/manager/share-review/publish/page.tsx");
const route = read("src/app/api/risk-share/manager/publish/route.ts");

const pageGuard = page.indexOf("const siteScope = await");
const pageRead = page.indexOf(
  "listRiskShareManagerPublishState(",
);
const routeGuard = route.indexOf("const siteScope = await");
const routeBodyRead = route.indexOf("request.text()");
const routeMutation = route.indexOf(
  "publishRiskShareVersionForTenantChecked({",
);

const checks = [
  [
    "Publish page validates canonical site before the Read Model",
    page.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && page.includes("tenantResolution.tenant.defaultSiteId")
      && pageGuard !== -1
      && pageGuard < pageRead,
  ],
  [
    "Publish mutation validates canonical site before reading the body",
    route.includes("resolveRiskShareCanonicalSiteScopeForTenant(")
      && route.includes("tenantResolution.tenant.defaultSiteId")
      && routeGuard !== -1
      && routeGuard < routeBodyRead,
  ],
  [
    "Publish mutation validates canonical site before the RPC",
    routeGuard !== -1
      && routeGuard < routeMutation
      && route.includes('jsonError(403, "site_scope_unavailable")'),
  ],
  [
    "Publish API exposes site scope failure without changing RPC result codes",
    route.includes('type PublishRiskShareApiCode =')
      && route.includes('| "site_scope_unavailable";')
      && route.includes(
        'function jsonError(status: number, code: PublishRiskShareApiCode)',
      ),
  ],
  [
    "Authentication and membership validation precede canonical site resolution",
    route.indexOf("requireTenantAccessForCurrentSession({") < routeGuard
      && route.indexOf("const actorMembershipId =") < routeGuard,
  ],
];

for (const [name, ok] of checks) {
  if (!ok) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}
