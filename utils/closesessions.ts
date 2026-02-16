import prisma from "@/utils/database";

export async function closeActiveSessions() {
  try {
    console.log("[STARTUP] Checking for active sessions to close...");

    const activeSessions = await prisma.activitySession.findMany({
      where: {
        active: true,
        archived: { not: true },
      },
    });

    if (activeSessions.length === 0) {
      console.log("[STARTUP] No active sessions found.");
      return;
    }

    console.log(
      `[STARTUP] Found ${activeSessions.length} active session(s). Closing them now...`
    );

    const result = await prisma.activitySession.updateMany({
      where: {
        active: true,
      },
      data: {
        endTime: new Date(),
        active: false,
      },
    });

    console.log(
      `[STARTUP] Successfully closed ${result.count} active session(s).`
    );
  } catch (error) {
    console.error("[STARTUP] Error closing active sessions:", error);
  }
}
