import "server-only";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/nextAuthOptions";

export type TenantSessionEmailResult =
  | { ok: true; userEmail: string }
  | { ok: false; reason: "unauthenticated" };

export function normalizeTenantSessionEmail(value?: string | null) {
  return value?.trim().toLowerCase().slice(0, 320) ?? "";
}

export async function getCurrentTenantSessionEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions).catch(() => null);
  const userEmail = normalizeTenantSessionEmail(session?.user?.email);

  return userEmail || null;
}

export async function requireCurrentTenantSessionEmail(): Promise<TenantSessionEmailResult> {
  const userEmail = await getCurrentTenantSessionEmail();

  if (!userEmail) {
    return { ok: false, reason: "unauthenticated" };
  }

  return { ok: true, userEmail };
}
