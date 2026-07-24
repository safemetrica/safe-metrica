import "server-only";

const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export type InvitePasswordUpdateResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "invite_invalid"
        | "password_invalid"
        | "request_limited"
        | "service_unavailable";
    };

function getConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;

  return url && anonKey ? { url, anonKey } : null;
}

export function isValidInviteAccessToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 64 &&
    value.length <= 8192 &&
    ACCESS_TOKEN_PATTERN.test(value)
  );
}

export function isValidNewPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 10 && value.length <= 128;
}

export async function updateInvitedUserPassword(
  accessToken: string,
  password: string,
): Promise<InvitePasswordUpdateResult> {
  const config = getConfig();

  if (!config) {
    return { ok: false, reason: "service_unavailable" };
  }

  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
      cache: "no-store",
    });

    if (response.ok) {
      return { ok: true };
    }

    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: "invite_invalid" };
    }

    if (response.status === 400 || response.status === 422) {
      return { ok: false, reason: "password_invalid" };
    }

    if (response.status === 429) {
      return { ok: false, reason: "request_limited" };
    }

    return { ok: false, reason: "service_unavailable" };
  } catch {
    return { ok: false, reason: "service_unavailable" };
  }
}
