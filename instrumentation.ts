const globalKey = "__orbit_started";
const dev = process.env.NODE_ENV !== "production";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const globalState = globalThis as typeof globalThis & {
    [globalKey]?: boolean;
  };

  if (globalState[globalKey]) {
    return;
  }

  globalState[globalKey] = true;

  if (dev) {
    const cache = await import("@/utils/cache");
    await cache.clear();
    console.log("[STARTUP] Cache cleared.")
  }

  const { getSettings } = await import("@/lib/instance");
  const settings = await getSettings();
  if (dev) {
    console.log("[STARTUP] Settings loaded.", settings);
  }
  if (!settings.isSetup && dev) {
    console.warn("[STARTUP] Instance is not setup!");
  }

  const { syncAllRobloxData } = await import("@/lib/crons/sync");

  void syncAllRobloxData();

  setInterval(() => {
    syncAllRobloxData();
  }, 30 * 60 * 1000);

  if (dev) {
    console.log("[STARTUP] Roblox sync scheduler started.");
  }
}
