const globalKey = '__orbit_started';

export default defineNitroPlugin(async () => {
  const globalState = globalThis as typeof globalThis & {
    [globalKey]?: boolean;
  };

  if (globalState[globalKey]) return;
  globalState[globalKey] = true;

  if (!process.env.SESSION_SECRET || !process.env.DATABASE_URL) {
    throw new Error(
      'SESSION_SECRET and DATABASE_URL must be set, see .env.example for instructions',
    );
  }

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
