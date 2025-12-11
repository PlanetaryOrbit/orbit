import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const apiKey = req.headers.authorization?.replace("Bearer ", "");
  if (!apiKey) {
    return res.status(401).json({ success: false, error: "Missing API key" });
  }

  const workspaceId = Number.parseInt(req.query.id as string);
  if (!workspaceId) {
    return res
      .status(400)
      .json({ success: false, error: "Missing workspace ID" });
  }

  try {
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
    });

    if (!key || key.workspaceGroupId !== workspaceId) {
      return res.status(401).json({ success: false, error: "Invalid API key" });
    }

    if (key.expiresAt && new Date() > key.expiresAt) {
      return res.status(401).json({ success: false, error: "API key expired" });
    }

    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsed: new Date() },
    });

    const daysParam = req.query.days
      ? Number.parseInt(req.query.days as string)
      : 7;
    const days = isNaN(daysParam) ? 7 : Math.min(Math.max(daysParam, 1), 14);
    const specificDate = req.query.date
      ? new Date(req.query.date as string)
      : null;
    const memberBirthdays = await prisma.workspaceMember.findMany({
      where: {
        workspaceGroupId: workspaceId,
        birthdayDay: { not: null },
        birthdayMonth: { not: null },
      },
      include: {
        user: {
          select: {
            userid: true,
            username: true,
          },
        },
      },
    });

    const today = specificDate || new Date();
    const todayYear = today.getFullYear();
    const filtered = memberBirthdays
      .filter((m) => (m.birthdayDay ?? 0) > 0 && (m.birthdayMonth ?? 0) > 0)
      .map((m) => {
        const month = m.birthdayMonth as number;
        const day = m.birthdayDay as number;
        let nextBirthday = new Date(todayYear, month - 1, day);
        const todayNormalized = new Date(
          todayYear,
          today.getMonth(),
          today.getDate()
        );

        if (nextBirthday < todayNormalized) {
          nextBirthday = new Date(todayYear + 1, month - 1, day);
        }

        const daysAway = Math.round(
          (nextBirthday.getTime() - todayNormalized.getTime()) / 86400000
        );
        return {
          userId: Number(m.user.userid),
          username: m.user.username || String(m.user.userid),
          birthdayDay: m.birthdayDay,
          birthdayMonth: m.birthdayMonth,
          daysAway,
          nextBirthday: nextBirthday.toISOString().split("T")[0], // YYYY-MM-DD
        };
      })
      .filter((m) => m.daysAway >= 0 && m.daysAway <= days)
      .sort((a, b) => a.daysAway - b.daysAway);

    return res.status(200).json({
      success: true,
      birthdays: filtered,
      total: filtered.length,
      filterDays: days,
      referenceDate: today.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Error in public birthdays API:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}
