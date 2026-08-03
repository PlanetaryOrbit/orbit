export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { closeActiveSessions } = await import("./utils/closesessions");
    await closeActiveSessions();
    const { initCronJobs } = await import("./utils/cronJobs");
    await initCronJobs();
    const cache = await import("./utils/cache");
    await cache.clear();
    console.log("[STARTUP] Cache cleared");
  }
}
