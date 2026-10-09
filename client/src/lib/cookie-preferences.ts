export const COOKIE_PREFERENCES_STORAGE_KEY = "agrohub.cookie-preferences.v1";
export const COOKIE_PREFERENCES_OPEN_EVENT = "agrohub:open-cookie-preferences";

export type CookiePreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string | null;
};

const defaults: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  updatedAt: null,
};

export function readCookiePreferences(): CookiePreferences {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(COOKIE_PREFERENCES_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<CookiePreferences>;
    return {
      necessary: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return defaults;
  }
}

export function saveCookiePreferences(value: Omit<CookiePreferences, "necessary" | "updatedAt">): CookiePreferences {
  const saved: CookiePreferences = {
    necessary: true,
    analytics: value.analytics,
    marketing: value.marketing,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(COOKIE_PREFERENCES_STORAGE_KEY, JSON.stringify(saved));
  return saved;
}
