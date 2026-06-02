import prisma from "@/utils/database";
import { getConfig } from "@/utils/configEngine";
import axios from "axios";

function getNextMilestone(count: number): number {
  const thresholds = [
    100, 250, 500, 750,
    1_000, 2_500, 5_000, 7_500,
    10_000, 25_000, 50_000, 75_000,
    100_000, 250_000, 500_000, 1_000_000,
  ];

  for (const t of thresholds) {
    if (count < t) return t;
  }

  return Math.ceil(count / 500_000) * 500_000;
}

function buildMilestoneMessage(groupName: string, currentCount: number, crossedMilestone: number): string {
  const nextMilestone = getNextMilestone(currentCount);
  const remaining = nextMilestone - currentCount;

  return (
    `:confetti_ball: **${groupName}** has reached **${crossedMilestone.toLocaleString()}** members! ` +
    `We are **${remaining.toLocaleString()}** members away from **${nextMilestone.toLocaleString()}** members!`
  );
}

function getCrossedMilestone(previous: number, current: number): number | null {
  const thresholds = [
    100, 250, 500, 750,
    1_000, 2_500, 5_000, 7_500,
    10_000, 25_000, 50_000, 75_000,
    100_000, 250_000, 500_000, 750_000,
    1_000_000,
  ];

  for (const t of thresholds) {
    if (previous < t && current >= t) return t;
  }

  if (current >= 100_000) {
    const prevTenK = Math.floor(previous / 10_000);
    const currTenK = Math.floor(current / 10_000);
    if (currTenK > prevTenK) return currTenK * 10_000;
    return null;
  }

  const prevK = Math.floor(previous / 1_000);
  const currK = Math.floor(current / 1_000);
  if (currK > prevK) return currK * 1_000;

  return null;
}

export async function runMilestoneCron() {
  try {
    const workspaces = await prisma.workspace.findMany({
      select: {
        groupId: true,
        groupName: true,
        memberCount: true,
      },
    });

    const results: any[] = [];

    for (const workspace of workspaces) {
      try {
        const [webhookConfig, openCloudKey] = await Promise.all([
          getConfig("discord_milestone", workspace.groupId),
          getConfig("roblox_opencloud", workspace.groupId),
        ]);

        if (
          !webhookConfig?.enabled ||
          !webhookConfig?.url ||
          !openCloudKey?.enabled ||
          !openCloudKey?.key
        ) {
          continue;
        }

        const { data } = await axios.get<{ memberCount: number }>(
          `https://apis.roblox.com/cloud/v2/groups/${workspace.groupId}`,
          {
            headers: {
              "x-api-key": openCloudKey.key,
            },
          }
        );

        const currentCount = data.memberCount;
        const previousCount = workspace.memberCount;

        await prisma.workspace.update({
          where: { groupId: workspace.groupId },
          data: { memberCount: currentCount },
        });

        if (previousCount == null) {
          const message = buildMilestoneMessage(
            workspace.groupName!,
            currentCount,
            currentCount
          );

          await axios.post(webhookConfig.url, {
            content: message,
            username: "Orbit",
            avatar_url:
              "http://cdn.planetaryapp.us/brand/planetary.png",
          });

          results.push({
            workspace: workspace.groupName,
            status: "first time count recorded",
            currentCount,
            message,
          });

          continue;
        }

        const crossed = getCrossedMilestone(
          previousCount,
          currentCount
        );

        if (!crossed) {
          results.push({
            workspace: workspace.groupName,
            status: "no milestone",
          });

          continue;
        }

        const message = buildMilestoneMessage(
          workspace.groupName!,
          currentCount,
          crossed
        );

        await axios.post(webhookConfig.url, {
          content: message,
          username: "Orbit",
          avatar_url:
            "http://cdn.planetaryapp.us/brand/planetary.png",
        });

        results.push({
          workspace: workspace.groupName,
          status: "milestone reached",
          milestone: crossed,
          currentCount,
          message,
        });
      } catch (error) {
        console.error(
          `Error processing milestone for workspace ${workspace.groupId}:`,
          error
        );

        results.push({
          workspace: workspace.groupName,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error",
        });
      }
    }

    return {
      success: true,
      processed: results.length,
      results,
    };
  } catch (error) {
    console.error("Error in milestone cron job:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    };
  }
}