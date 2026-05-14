// src/lib/dailySafetyCase.ts

export function getKstDateKey(date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export function stableHash(input: string): number {
  let hash = 0;

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function pickDailyItem<T>(
  items: T[],
  seedParts: Array<string | null | undefined>
): T | null {
  if (!items.length) return null;

  const seed = seedParts.filter(Boolean).join("|");
  const index = stableHash(seed) % items.length;

  return items[index] ?? null;
}