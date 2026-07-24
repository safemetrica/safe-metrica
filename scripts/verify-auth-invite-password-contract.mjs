import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const page = read("src/app/auth/callback/page.tsx");
const client = read("src/app/auth/callback/InvitePasswordForm.tsx");
const route = read("src/app/api/auth/invite/password/route.ts");
const helper = read("src/lib/auth/invitePassword.ts");
const proxy = read("src/proxy.ts");
const login = read("src/app/login/page.tsx");

const combinedAuthFlow = `${page}\n${client}\n${route}\n${helper}`;

const checks = [
  [
    "implicit invite fragment is parsed client-side",
    /window\.location\.hash/.test(client)
      && /access_token/.test(client)
      && /flowType !== "invite"/.test(client),
  ],
  [
    "callback credentials are removed from browser URL",
    /window\.history\.replaceState\(null, "", window\.location\.pathname\)/.test(client),
  ],
  [
    "invite token is memory-only",
    /useRef\(""\)/.test(client)
      && !/localStorage|sessionStorage|document\.cookie/.test(client),
  ],
  [
    "unsupported PKCE and token-hash inputs fail closed",
    /query\.get\("code"\)/.test(client) && /query\.get\("token_hash"\)/.test(client),
  ],
  [
    "password update is same-origin and no-store",
    /fetch\("\/api\/auth\/invite\/password"/.test(client)
      && /credentials: "same-origin"/.test(client)
      && /referrerPolicy: "no-referrer"/.test(client),
  ],
  [
    "API enforces same-origin JSON and request size",
    /request\.headers\.get\("x-forwarded-host"\)/.test(route)
      && /request\.headers\.get\("host"\)/.test(route)
      && /allowedHosts\.has\(originUrl\.host\)/.test(route)
      && /allowedProtocols\.has\(originUrl\.protocol\)/.test(route)
      && /application\/json/.test(route)
      && /MAX_REQUEST_BYTES/.test(route),
  ],
  [
    "server validates invite token and matching password",
    /isValidInviteAccessToken/.test(route)
      && /isValidNewPassword/.test(route)
      && /password !== passwordConfirm/.test(route),
  ],
  [
    "Supabase password update uses user token and anon key",
    /SUPABASE_ANON_KEY/.test(helper)
      && /\/auth\/v1\/user/.test(helper)
      && /method: "PUT"/.test(helper)
      && /Authorization: `Bearer \$\{accessToken\}`/.test(helper),
  ],
  [
    "service role is absent from invite flow",
    !/SERVICE_ROLE|service_role|SUPABASE_SERVICE_ROLE_KEY/.test(combinedAuthFlow),
  ],
  [
    "tenant and entitlement writes are absent",
    !/tenant_membership|tenant_registry|tenant_product_entitlement|create_self_service_tenant/.test(
      combinedAuthFlow,
    ),
  ],
  [
    "callback is explicitly public",
    /"\/auth\/callback"/.test(proxy),
  ],
  [
    "success redirect is fixed and login confirms completion",
    /href="\/login\?password_set=1"/.test(client)
      && /password_set/.test(login)
      && !/callbackUrl|redirectTo|next=/.test(client),
  ],
  [
    "callback is not indexed and does not send referrers",
    /index: false/.test(page)
      && /noarchive: true/.test(page)
      && /referrer: "no-referrer"/.test(page),
  ],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (ok) {
    console.log(`PASS ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

if (failed > 0) {
  console.error(`AUTH_INVITE_PASSWORD_CONTRACT_FAILED ${failed}/${checks.length}`);
  process.exit(1);
}

console.log(`AUTH_INVITE_PASSWORD_CONTRACT_PASS ${checks.length}/${checks.length}`);
