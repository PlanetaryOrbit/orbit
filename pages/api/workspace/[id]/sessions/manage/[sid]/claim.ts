// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import prisma, { schedule } from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";
import roles from "../../../settings/roles";
type Data = {
  success: boolean;
  error?: string;
  session?: schedule;
};

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  const { id, sid } = req.query;
  if (!id || !sid)
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  const { date, timezoneOffset } = req.body;
  if (!date)
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  const day = new Date(date);

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const user = await prisma.user.findUnique({
    where: {
      userid: BigInt(req.session.userid),
    },
    include: {
      roles: {
        where: {
          workspaceGroupId: parseInt(req.query.id as string),
        },
      },
      workspaceMemberships: {
        where: {
          workspaceGroupId: parseInt(req.query.id as string),
        },
      },
    },
  });

  const membership = user?.workspaceMemberships[0];
  const isAdmin = membership?.isAdmin || false;

  const schedule = await prisma.schedule.findFirst({
    where: {
      id: sid as string,
      Days: {
        has: day.getUTCDay(),
      },
    },
    include: {
      sessionType: true,
      sessions: {
        take: 1,
        orderBy: { date: 'desc' },
      },
    },
  });
  

  const existingSessionType = schedule?.sessions?.[0]?.type?.toLowerCase() || 'other';
  const validTypes = ['shift', 'training', 'event', 'other'];
  const type = validTypes.includes(existingSessionType) ? existingSessionType : 'other';
  const userRoles = user?.roles || [];
  const hasHostPermission = userRoles.some((ur: any) => Array.isArray(ur.permissions) && ur.permissions.includes(`sessions_${type}_host`));
  const hasAdminPerm = userRoles.some((ur: any) => Array.isArray(ur.permissions) && ur.permissions.includes("admin"));

  if (!hasHostPermission && !isAdmin && !hasAdminPerm) {
    return res.status(403).json({ success: false, error: "You do not have permission to claim this session" });
  }
  if (!schedule)
    return res.status(400).json({ success: false, error: "Invalid schedule" });
  //get date to utc
  const dateTime = new Date();
  dateTime.setUTCHours(schedule.Hour);
  dateTime.setUTCMinutes(schedule.Minute);
  dateTime.setUTCSeconds(0);
  dateTime.setUTCMilliseconds(0);
  dateTime.setUTCDate(day.getUTCDate());
  dateTime.setUTCMonth(day.getUTCMonth());
  dateTime.setUTCFullYear(day.getUTCFullYear());

  const findSession = await prisma.session.findFirst({
    where: {
      date: dateTime,
      sessionTypeId: schedule.sessionTypeId,
    },
  });
  if (findSession) {
    const schedulewithsession = await prisma.schedule.update({
      where: {
        id: schedule.id,
      },
      data: {
        sessions: {
          update: {
            where: {
              id: findSession.id,
            },
            data: {
              ownerId: BigInt(req.session.userid),
            },
          },
        },
      },
      include: {
        sessionType: true,
        sessions: {
          include: {
            owner: true,
          },
        },
      },
    });

    return res
      .status(200)
      .json({
        success: true,
        session: JSON.parse(
          JSON.stringify(schedulewithsession, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
      });
  }

  const schedulewithsession = await prisma.schedule.update({
    where: {
      id: schedule.id,
    },
    data: {
      sessions: {
        create: {
          date: dateTime,
          sessionTypeId: schedule.sessionTypeId,
          ownerId: req.session.userid,
          startedAt: dateTime,
        },
      },
    },
    include: {
      sessionType: true,
      sessions: {
        include: {
          owner: true,
        },
      },
    },
  });

  res
    .status(200)
    .json({
      success: true,
      session: JSON.parse(
        JSON.stringify(schedulewithsession, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      ),
    });
}
