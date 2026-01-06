import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { getConfig } from "@/utils/configEngine";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = req.headers["x-cron-secret"] || req.headers.authorization;
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return res.status(500).json({ error: "CRON_SECRET not configured" });
  }

  if (!cronSecret || String(cronSecret) !== expectedSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
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

        if (!webhookConfig || !webhookConfig.enabled || !webhookConfig.url) {
          continue;
        }

        const embedColor = 0xff0099;

        const today = new Date();
        const todayDay = today.getDate();
        const todayMonth = today.getMonth() + 1;

        const membersWithBirthdays = await prisma.workspaceMember.findMany({
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
            avatar_url: `http://cdn.planetaryapp.us/brand/planetary.png`,
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
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } catch (error) {
        console.error(
          `Error processing birthdays for workspace ${workspace.groupId}:`,
          error
        );
        results.push({
          workspace: workspace.groupName,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return res.status(200).json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Error in birthday cron job:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
