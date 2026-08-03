export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cache = await import("./utils/cache");
    await cache.clear();
    console.log("[STARTUP] Cache cleared.");
    const { getSettings } = await import("@/lib/instance");
    const settings = await getSettings();
    console.log("[STARTUP] Settings loaded.", settings);
    if (!settings.isSetup) {
      console.warn("[STARTUP] Instance is not setup!")
    }
    const { syncAllRobloxData } = await import(
      "@/lib/crons/sync"
    );
    void syncAllRobloxData();
    setInterval(
      () => {
        syncAllRobloxData();
      },
      30 * 60 * 1000,
    );
    console.log(
      "[STARTUP] Roblox sync scheduler started.",
    );
  }
}
