const globalKey = '__orbit_started';

export default defineNitroPlugin(async () => {
  const globalState = globalThis as typeof globalThis & {
    [globalKey]?: boolean;
  };

  if (globalState[globalKey]) return;
  globalState[globalKey] = true;

  const dev = import.meta.dev;

  if (dev) {
    const { clear } = await import('~~/server/utils/cache');
    await clear();
    console.log('[STARTUP] Cache cleared.');
  }

  const { getSettings } = await import('~~/server/lib/instance');
  const settings = await getSettings();

  if (dev) {
    console.log('[STARTUP] Settings loaded.', settings);

    if (!settings.isSetup) {
      console.warn('[STARTUP] Instance is not setup!');
    }
  }
});
