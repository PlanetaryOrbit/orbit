import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const workspaceGroupId = parseInt(req.query.id as string);

  const roles = await prisma.role.findMany({
    where: { workspaceGroupId },
    include: {
      members: {
        select: {
          userid: true,
          username: true,
          picture: true,
          birthdayDay: true,
          birthdayMonth: true,
        }
      }
    }
  });

  const userMap = new Map<string, any>();
  for (const role of roles) {
    for (const user of role.members) {
      if (
        user.birthdayDay !== null &&
        user.birthdayMonth !== null &&
        !userMap.has(user.userid.toString())
      ) {
        userMap.set(user.userid.toString(), user);
      }
    }
  }
  const users = Array.from(userMap.values());

  res.status(200).json({
    birthdays: users.map(user => ({
      ...user,
      userid: user.userid.toString(),
    })),
  });
}