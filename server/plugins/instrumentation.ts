const globalKey = '__orbit_started';

export default defineNitroPlugin(async () => {
  const globalState = globalThis as typeof globalThis & {
    [globalKey]?: boolean;
  };

  if (globalState[globalKey]) {
    return;
  }

  globalState[globalKey] = true;

  const config = useRuntimeConfig();
  const dev = import.meta.dev;

  if (dev) {
    const cache = await import('~~/server/utils/cache');

    await cache.clear();

    console.log('[STARTUP] Cache cleared.');
  }

  const { getSettings } = await import('~~/server/lib/instance');

  const settings = await getSettings();

  if (dev) {
    console.log('[STARTUP] Settings loaded.', settings);
  }

  if (!settings.isSetup && dev) {
    console.warn('[STARTUP] Instance is not setup!');
  }

  if (dev) {
    console.log('[STARTUP] Roblox sync scheduler started.');
  }
});
