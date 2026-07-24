import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const actions = read("src/lib/tenant-onboarding/ownerTenantCommercialActions.ts");
const route = read("src/app/api/owner/tenant-onboarding/membership/create/route.ts");
const page = read("src/app/owner/tenant-onboarding/draft/page.tsx");
const proxy = read("src/proxy.ts");

const inviteStart = actions.indexOf("export async function inviteOwnerTenantMembership");
const inviteEnd = actions.indexOf("export type CreateOwnerTenantMembershipInput");
const invite = actions.slice(inviteStart, inviteEnd);

const checks = [
  ["server-only Auth admin", /import "server-only"/.test(actions)
    && /\/auth\/v1\/invite/.test(actions)
    && /Authorization: `Bearer \$\{config\.serviceRoleKey\}`/.test(actions)],
  ["fixed Production callback", /OWNER_INVITE_REDIRECT_URL = "https:\/\/www\.safemetrica\.com\/auth\/callback"/.test(actions)
    && /searchParams\.set\("redirect_to", OWNER_INVITE_REDIRECT_URL\)/.test(actions)],
  ["tenant eligibility before invite", invite.indexOf("resolveEligibleTenant")
    < invite.indexOf("sendSupabaseAuthInvite")],
  ["existing membership blocks invite", invite.indexOf("findExistingTenantMembership")
    < invite.indexOf("sendSupabaseAuthInvite")
    && /return \{ ok: false, reason: "membership_exists" \}/.test(invite)],
  ["invite response binds Auth user", /const invitedUserId = inviteResult\.userId/.test(invite)
    && /user_id: invitedUserId/.test(invite)
    && /status: "invited"/.test(invite)],
  ["membership follows successful invite", invite.indexOf("sendSupabaseAuthInvite")
    < invite.indexOf("insertTenantMembershipRow")],
  ["failed membership compensates Auth user", /deleteSupabaseAuthUser\(/.test(invite)
    && /!rollbackResult\?\.ok/.test(invite)
    && /invite_rollback_failed/.test(invite)
    && invite.indexOf("insertTenantMembershipRow") < invite.indexOf("deleteSupabaseAuthUser")],
  ["no activation or entitlement mutation", !/activateTenantAfterProfile|tenant_product_entitlements/.test(invite)],
  ["Owner route keeps active confirmation gate", /membershipStatus === "active" && !authAccountConfirmed/.test(route)
    && /membershipStatus === "invited"[\s\S]*inviteOwnerTenantMembership/.test(route)],
  ["Owner route rejects CSRF and oversized bodies", /isSameOrigin\(request\)/.test(route)
    && /MAX_REQUEST_BYTES = 16 \* 1024/.test(route)
    && /application\/x-www-form-urlencoded/.test(route)
    && /reader\.cancel/.test(route)],
  ["POST redirects cannot replay the invitation", /NextResponse\.redirect\(url, 303\)/.test(route)],
  ["Owner UI explains invite behavior", /Production callback/.test(page)
    && /관리자 초대·멤버십 연결/.test(page)],
  ["callback remains explicitly public", /"\/auth\/callback"/.test(proxy)],
];

assert.ok(inviteStart >= 0 && inviteEnd > inviteStart, "Owner invite function is present");
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
assert.equal(checks.some(([, ok]) => !ok), false, "Owner Auth invite contract failed");
console.log("PASS Owner Auth invite contract");
