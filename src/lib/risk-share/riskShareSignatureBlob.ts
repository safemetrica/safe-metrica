import "server-only";

import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";

const PRIVATE_BLOB_HOSTNAME_SUFFIX = ".private.blob.vercel-storage.com";
const SIGNATURE_CONTENT_TYPE = "image/png";

export type RiskShareSignatureUploadResult =
  | {
      ok: true;
      pathname: string;
      contentType: typeof SIGNATURE_CONTENT_TYPE;
      sizeBytes: number;
      cleanupUrl: string;
    }
  | { ok: false };

type RiskShareSignatureBlobCredentials = {
  oidcToken: string;
  storeId: string;
};

function getRiskShareSignatureBlobCredentials(
  rawOidcToken: string,
): RiskShareSignatureBlobCredentials | null {
  const oidcToken = rawOidcToken.trim();
  const storeId = process.env.RISK_SOURCE_BLOB_STORE_ID?.trim();

  if (!oidcToken || !storeId) {
    return null;
  }

  return { oidcToken, storeId };
}

async function safeDeletePrivateBlob(url: string, credentials: RiskShareSignatureBlobCredentials) {
  try {
    await del(url, { oidcToken: credentials.oidcToken, storeId: credentials.storeId });
  } catch {
    // Cleanup is best-effort only; failure detail is never surfaced to the client or logged.
  }
}

export async function uploadPrivateRiskShareSignature(
  file: File,
  pathnamePrefix: string,
  rawOidcToken: string,
): Promise<RiskShareSignatureUploadResult> {
  const credentials = getRiskShareSignatureBlobCredentials(rawOidcToken);

  if (!credentials) {
    return { ok: false };
  }

  const pathname = `${pathnamePrefix}/${randomUUID()}-signature.png`;

  let blob: Awaited<ReturnType<typeof put>>;

  try {
    blob = await put(pathname, file, {
      access: "private",
      oidcToken: credentials.oidcToken,
      storeId: credentials.storeId,
      addRandomSuffix: false,
      contentType: SIGNATURE_CONTENT_TYPE,
    });
  } catch {
    return { ok: false };
  }

  let blobUrl: URL | null = null;

  try {
    blobUrl = new URL(blob.url);
  } catch {
    blobUrl = null;
  }

  const isStrictPrivateBlobUrl =
    blobUrl !== null &&
    blobUrl.protocol === "https:" &&
    blobUrl.hostname.endsWith(PRIVATE_BLOB_HOSTNAME_SUFFIX);

  if (!isStrictPrivateBlobUrl) {
    await safeDeletePrivateBlob(blob.url, credentials);
    return { ok: false };
  }

  return {
    ok: true,
    pathname: blob.pathname,
    contentType: SIGNATURE_CONTENT_TYPE,
    sizeBytes: file.size,
    cleanupUrl: blob.url,
  };
}

export async function deletePrivateRiskShareSignature(
  cleanupUrl: string,
  rawOidcToken: string,
): Promise<void> {
  const credentials = getRiskShareSignatureBlobCredentials(rawOidcToken);

  if (!credentials) {
    return;
  }

  await safeDeletePrivateBlob(cleanupUrl, credentials);
}
