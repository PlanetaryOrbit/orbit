export type AccountTab = 'profile' | 'connections' | 'security' | 'preferences';
export type ProviderKey = 'discord' | 'google';

export type AccountSession = {
  id: string;
  browser: string | null;
  os: string | null;
  device: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
  country: string | null;
  region: string | null;
};

export type AccountPreferences = {
  reduceMotion: boolean;
  compact: boolean;
};

export const ACCOUNT_PREFERENCES_KEY = 'orbit:account-preferences';

export const DEFAULT_ACCOUNT_PREFERENCES: AccountPreferences = {
  reduceMotion: false,
  compact: false,
};

export const ACCOUNT_TABS: AccountTab[] = ['profile', 'connections', 'security', 'preferences'];

export function isAccountTab(value: unknown): value is AccountTab {
  return typeof value === 'string' && ACCOUNT_TABS.includes(value as AccountTab);
}

export function readAccountPreferences(): AccountPreferences {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNT_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(ACCOUNT_PREFERENCES_KEY);
    if (!raw) return DEFAULT_ACCOUNT_PREFERENCES;

    const parsed = JSON.parse(raw) as Partial<AccountPreferences>;

    return {
      reduceMotion: parsed.reduceMotion === true,
      compact: parsed.compact === true,
    };
  } catch {
    return DEFAULT_ACCOUNT_PREFERENCES;
  }
}

export function applyAccountPreferences(preferences: AccountPreferences): void {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.toggle('orbit-reduce-motion', preferences.reduceMotion);
  document.documentElement.dataset.density = preferences.compact ? 'compact' : 'comfortable';
}
