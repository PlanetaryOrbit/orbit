import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";

export default withSessionRoute(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!req.session.userid) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const workspaceGroupId = parseInt(req.query.id as string, 10);
  if (!workspaceGroupId)
    return res
      .status(400)
      .json({ success: false, error: "Invalid workspace id" });

  const userid = Number(req.session.userid);
  try {
    await prisma.workspaceMember.upsert({
      where: { workspaceGroupId_userId: { workspaceGroupId, userId: userid } },
      create: { workspaceGroupId, userId: userid },
      update: {},
    });
  } catch {}

  const memberBirthdays = await prisma.workspaceMember.findMany({
    where: {
      workspaceGroupId,
      user: {
        birthdayDay: { not: null },
        birthdayMonth: { not: null },
      },
    },
    include: {
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

  const today = new Date();
  const todayY = today.getFullYear();

  const filtered = memberBirthdays
    .filter(
      (m: (typeof memberBirthdays)[number]) =>
        (m.user.birthdayDay ?? 0) > 0 && (m.user.birthdayMonth ?? 0) > 0
    )
    .map((m: (typeof memberBirthdays)[number]) => {
      const month = m.user.birthdayMonth as number;
      const day = m.user.birthdayDay as number;
      let next = new Date(todayY, month - 1, day);
      if (next < new Date(todayY, today.getMonth(), today.getDate())) {
        next = new Date(todayY + 1, month - 1, day);
      }
      const daysAway = Math.round(
        (next.getTime() - today.getTime()) / 86400000
      );
      return {
        userid: m.user.userid.toString(),
        username: m.user.username || m.user.userid.toString(),
        picture: m.user.picture,
        birthdayDay: m.user.birthdayDay,
        birthdayMonth: m.user.birthdayMonth,
        _daysAway: daysAway,
      };
    })
    .sort(
      (a: { _daysAway: number }, b: { _daysAway: number }) =>
        a._daysAway - b._daysAway
    )
    .map(
      ({
        _daysAway,
        ...rest
      }: {
        _daysAway: number;
        userid: string;
        username: string;
        picture: string | null;
        birthdayDay: number | null;
        birthdayMonth: number | null;
      }) => rest
    ); // strip helper

  res.json({ success: true, birthdays: filtered });
});
