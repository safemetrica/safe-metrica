import "server-only";

const MAX_SIGNATURE_FILE_SIZE_BYTES = 1.5 * 1024 * 1024;

const PNG_MAGIC_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type RiskShareSignatureFileResult =
  | { ok: true; file: File | null }
  | {
      ok: false;
      reason: "invalid_file" | "file_too_large" | "invalid_mime" | "invalid_content";
    };

async function hasPngMagicBytes(file: File): Promise<boolean> {
  try {
    const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());

    if (header.length !== PNG_MAGIC_BYTES.length) {
      return false;
    }

    return PNG_MAGIC_BYTES.every((byte, index) => header[index] === byte);
  } catch {
    return false;
  }
}

export async function resolveOptionalRiskShareSignatureFile(
  value: FormDataEntryValue | null,
): Promise<RiskShareSignatureFileResult> {
  if (value === null) {
    return { ok: true, file: null };
  }

  if (!(value instanceof File)) {
    return { ok: false, reason: "invalid_file" };
  }

  if (value.size === 0) {
    return { ok: true, file: null };
  }

  if (value.size > MAX_SIGNATURE_FILE_SIZE_BYTES) {
    return { ok: false, reason: "file_too_large" };
  }

  if (value.type !== "image/png") {
    return { ok: false, reason: "invalid_mime" };
  }

  if (!(await hasPngMagicBytes(value))) {
    return { ok: false, reason: "invalid_content" };
  }

  return { ok: true, file: value };
}
