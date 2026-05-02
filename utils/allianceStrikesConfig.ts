export const ALLIANCE_STRIKES_DEFAULT_MAX = 5;
export const ALLIANCE_STRIKES_MIN = 1;
export const ALLIANCE_STRIKES_SETTING_MAX = 25;
export const ALLIANCE_STRIKES_ABS_CAP = 99;

export function normalizeAllianceMaxStrikes(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  const v = Number.isFinite(n) ? Math.floor(n) : ALLIANCE_STRIKES_DEFAULT_MAX;
  return Math.min(
    ALLIANCE_STRIKES_ABS_CAP,
    Math.max(ALLIANCE_STRIKES_MIN, Math.min(ALLIANCE_STRIKES_SETTING_MAX, v)),
  );
}
