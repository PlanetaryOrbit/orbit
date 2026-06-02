import prisma from "@/utils/database";
import { getConfig } from "@/utils/configEngine";

export async function runBirthdayCron() {
  const workspaces = await prisma.workspace.findMany({
    select: {
      groupId: true,
      groupName: true,
    },
  });

  const results = [];

  for (const workspace of workspaces) {
    try {
      const webhookConfig = await getConfig(
        "birthday_webhook",
        workspace.groupId
      );

      if (!webhookConfig?.enabled || !webhookConfig.url) {
        continue;
      }

      const embedColor = 0xff0099;

      const today = new Date();
      const todayDay = today.getDate();
      const todayMonth = today.getMonth() + 1;

      const membersWithBirthdays =
        await prisma.workspaceMember.findMany({
          where: {
            workspaceGroupId: workspace.groupId,
            user: {
              birthdayDay: todayDay,
              birthdayMonth: todayMonth,
            },
          },
          select: {
            discordId: true,
            user: {
              select: {
                userid: true,
                username: true,
                picture: true,
                birthdayDay: true,
                birthdayMonth: true,
              },
            },
          },
        });

      if (membersWithBirthdays.length === 0) {
        continue;
      }

      for (const member of membersWithBirthdays) {
        const user = member.user;

        const colorHex = embedColor
          .toString(16)
          .toUpperCase()
          .padStart(6, "0");

        const embed: any = {
          title: "🎉 Birthday Celebration! 🎉",
          description: `It's **${user.username}**'s birthday today!\n\nWish them a happy birthday!`,
          color: embedColor,
          thumbnail: {
            url: `https://api.bloxy.services/avatar/${user.userid}/${colorHex}`,
          },
          timestamp: new Date().toISOString(),
        };

        if (workspace.groupName) {
          embed.footer = {
            text: `${workspace.groupName} • Orbit`,
          };
        }

        const webhookBody: any = {
          embeds: [embed],
          username: "Planetary Birthdays",
          avatar_url:
            "http://cdn.planetaryapp.us/brand/planetary.png",
        };

        if (member.discordId) {
          webhookBody.content = `<@${member.discordId}>`;
        }

        const response = await fetch(webhookConfig.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookBody),
        });

        const responseText = await response.text();

        results.push({
          workspace: workspace.groupName,
          user: user.username,
          status: response.ok ? "success" : "failed",
          statusCode: response.status,
          error: response.ok ? undefined : responseText,
        });

        if (membersWithBirthdays.length > 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000)
          );
        }
      }
    } catch (error) {
      console.error(
        `Error processing birthdays for workspace ${workspace.groupId}:`,
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
}