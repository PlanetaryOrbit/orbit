import prisma from "@/utils/database";
import { checkGroupRoles } from "@/utils/permissionsManager";

export async function runRoleSyncCron() {
  try {
    const ws = await prisma.workspace.findMany({});
    const ids: number[] = [];

    const isMultiContainer = process.env.NEXT_MULTI === "true";

    if (isMultiContainer) {
      console.log(
        `[cron-update-roles] Multi-container mode: Starting sequential sync of ${ws.length} workspaces`
      );

      for (let i = 0; i < ws.length; i++) {
        const w = ws[i];

        ids.push(w.groupId);

        try {
          await checkGroupRoles(w.groupId);

          console.log(
            `[cron-update-roles] Successfully synced workspace ${w.groupId}`
          );
        } catch (e) {
          console.error(
            "checkgrouproles cron error for",
            w.groupId,
            e
          );
        }

        if (i < ws.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 15000)
          );
        }
      }
    } else {
      console.log(
        `[cron-update-roles] Single-container mode: Starting parallel sync of ${ws.length} workspaces`
      );

      await Promise.allSettled(
        ws.map(async (w) => {
          ids.push(w.groupId);
          await checkGroupRoles(w.groupId);
        })
      );
    }

    return {
      success: true,
      started: ids.length,
      workspaces: ids,
    };
  } catch (e: any) {
    console.error(
      "Cron checkgrouproles error:",
      e
    );

    return {
      success: false,
      error: String(e?.message || e),
    };
  }
}