import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20260721030000_add_self_service_signup_foundation.sql");
const helper = read("src/lib/self-service/selfServiceSignup.ts");
const route = read("src/app/api/self-service/signup/route.ts");
const page = read("src/app/signup/page.tsx");
const login = read("src/app/login/page.tsx");
const proxy = read("src/proxy.ts");

const checks = [
  ["atomic tenant and membership RPC", /create or replace function public\.create_self_service_tenant/.test(migration) && /insert into public\.tenant_registry/.test(migration) && /insert into public\.tenant_membership/.test(migration)],
  ["fixed duplicate locks", (migration.match(/pg_advisory_xact_lock/g) ?? []).length === 2 && migration.indexOf("self-service-user:") < migration.indexOf("self-service-company:")],
  ["self-service duplicate indexes", /tenant_registry_self_service_company_name_uidx/.test(migration) && /tenant_membership_self_service_user_uidx/.test(migration)],
  ["tenant admin membership", /'tenant_admin'/.test(migration) && /'active'/.test(migration) && /'self_service'/.test(migration)],
  ["service role only RPC", /security definer/.test(migration) && /set search_path = public, pg_temp/.test(migration) && /revoke execute[^;]*anon, authenticated/.test(migration) && /grant execute[^;]*service_role/.test(migration)],
  ["no password stored in tenant data", !/p_password|password.*jsonb_build_object|password.*raw_payload/i.test(migration)],
  ["server creates Supabase Auth user", /import "server-only"/.test(helper) && /auth\/v1\/admin\/users/.test(helper) && /email_confirm: true/.test(helper)],
  ["safe auth retry proves password", /grant_type=password/.test(helper) && /verifyExistingAuthUser/.test(helper)],
  ["deterministic company identity", /createHash\("sha256"\)/.test(helper) && /buildSelfServiceCompanyCode/.test(helper)],
  ["helper calls atomic RPC", /rpc\/create_self_service_tenant/.test(helper) && /p_user_id/.test(helper) && /p_company_code/.test(helper)],
  ["route rejects cross-origin and requires terms", /isSameOrigin\(request\)/.test(route) && /termsAccepted/.test(route) && /website/.test(route)],
  ["password confirmation fails closed", /password !== passwordConfirm/.test(route) && /password_mismatch/.test(route) && /name="passwordConfirm"/.test(page)],
  ["customer errors hide internal details", /ERROR_MESSAGES/.test(page) && !/result_code|service_role|tenant_registry|tenant_membership|RPC/.test(page)],
  ["signup fields complete", /name="companyName"/.test(page) && /name="displayName"/.test(page) && /name="email"/.test(page) && /name="password"/.test(page)],
  ["login and signup connected", /href="\/signup"/.test(login) && /href="\/login"/.test(page) && /registered/.test(login) && /import Link from "next\/link"/.test(login)],
  ["signup explicitly public", /"\/signup"/.test(proxy) && /"\/api\/self-service\/signup"/.test(proxy)],
  ["legacy public QR paths retained", /"\/field\/participation"/.test(proxy) && /"\/field\/anonymous-feedback"/.test(proxy) && /"\/field\/representative-confirmation"/.test(proxy)],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log("PASS self-service signup contract");
