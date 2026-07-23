import fs from "node:fs";

import {
  buildSyntheticManifest,
  runReadOnlySyntheticPreflight,
  validateSyntheticManifest,
} from "./lib/syntheticTenantProductionE2ePreflight.mjs";

function fail(message) {
  console.error(`HOLD ${message}`);
  process.exitCode = 1;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_required`);
  return value;
}

function readManifest(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

async function main() {
  const command = process.argv[2];

  if (command === "manifest") {
    const manifest = buildSyntheticManifest({
      sequence: requiredEnv("SM_E2E_SEQUENCE"),
      accountEmail: requiredEnv("SM_E2E_ACCOUNT_EMAIL"),
      approvedBy: requiredEnv("SM_E2E_APPROVED_BY"),
      phaseApprovalReferences: {
        fixture_creation: requiredEnv(
          "SM_E2E_FIXTURE_CREATION_APPROVAL_REFERENCE",
        ),
        authenticated_runtime:
          process.env.SM_E2E_AUTHENTICATED_RUNTIME_APPROVAL_REFERENCE,
        public_qr_submission:
          process.env.SM_E2E_PUBLIC_QR_APPROVAL_REFERENCE,
        cleanup_writes: process.env.SM_E2E_CLEANUP_APPROVAL_REFERENCE,
      },
    });

    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
    return;
  }

  if (command === "validate") {
    const manifest = readManifest(requiredEnv("SM_E2E_MANIFEST_PATH"));
    const result = validateSyntheticManifest(manifest, {
      accountEmail: requiredEnv("SM_E2E_ACCOUNT_EMAIL"),
    });

    if (!result.ok) {
      fail(result.errors.join(","));
      return;
    }

    console.log("PASS synthetic tenant Production E2E manifest");
    return;
  }

  if (command === "preflight") {
    const manifest = readManifest(requiredEnv("SM_E2E_MANIFEST_PATH"));
    const result = await runReadOnlySyntheticPreflight({
      manifest,
      accountEmail: requiredEnv("SM_E2E_ACCOUNT_EMAIL"),
      supabaseUrl: requiredEnv("SUPABASE_URL"),
      serviceRoleKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    });

    const safeResult = {
      ...result,
      accountEmail: undefined,
      serviceRoleKey: undefined,
    };
    process.stdout.write(`${JSON.stringify(safeResult, null, 2)}\n`);

    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }

  fail("command_must_be_manifest_validate_or_preflight");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "unexpected_error");
});
