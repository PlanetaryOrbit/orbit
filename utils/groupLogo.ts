const ROBLOX_CDN_HOST = /(^|\.)rbxcdn\.com$/i;
const CDN_SIZE_SEGMENTS = /\/(\d+)\/(\d+)(?=\/Image\/)/i;
const MAX_GROUP_ICON_SIZE = '420';

export function highResGroupLogo(url?: string | null, fallback = '/favicon-32x32.png'): string {
  if (!url) return fallback;

  try {
    if (!ROBLOX_CDN_HOST.test(new URL(url).hostname)) return url;
  } catch {
    return url;
  }

  return url.replace(
    CDN_SIZE_SEGMENTS,
    (_match, _width: string, _height: string) => `/${MAX_GROUP_ICON_SIZE}/${MAX_GROUP_ICON_SIZE}`,
  );
}
