import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";

const sessionCreationLimits: { [key: string]: { count: number; resetTime: number } } = {};
function checkSessionCreationRateLimit(req: NextApiRequest, res: NextApiResponse): boolean {
  const workspaceId = req.query?.id || 'unknown';
  const userId = (req as any).session?.userid || 'anonymous';
  const key = `workspace:${workspaceId}:user:${userId}`;
  const now = Date.now();
  const windowMs = 40 * 1000;
  const maxRequests = 5;

  let entry = sessionCreationLimits[key];
  if (!entry || now >= entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
    sessionCreationLimits[key] = entry;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    res.status(429).json({
      success: false,
      error: 'Too many session creation requests.'
    });
    return false;
  }
  return true;
}

type Data = {
  success: boolean;
  error?: string;
  session?: any;
};

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (!checkSessionCreationRateLimit(req, res)) return;
  
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const { sessionTypeId, date, time, name, type, timezoneOffset, duration } = req.body;

  if (!sessionTypeId || !date || !time || !name || !type) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  const validTypes = ["shift", "training", "event", "other"];
  if (!validTypes.includes(type)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid session type" });
  }

  if (!req.session?.userid) {
    return res.status(401).json({ 
      success: false, 
      error: "Not authenticated" 
    });
  }

  const userId = BigInt(req.session.userid);
  const workspaceId = parseInt(req.query.id as string);
  const user = await prisma.user.findFirst({
    where: { userid: userId },
    include: {
      roles: {
        where: { workspaceGroupId: workspaceId },
      },
      workspaceMemberships: {
        where: { workspaceGroupId: workspaceId },
      },
    },
  });

  const membership = user?.workspaceMemberships?.[0];
  const isAdmin = membership?.isAdmin || false;
  const userRole = user?.roles?.[0];
  const requiredPermission = `sessions_${type}_unscheduled`;

  if (!isAdmin && (!userRole || !userRole.permissions.includes(requiredPermission))) {
    return res.status(403).json({ 
      success: false, 
      error: `You don't have permission to create unscheduled ${type} sessions` 
    });
  }

  try {
    const sessionType = await prisma.sessionType.findUnique({
      where: { id: sessionTypeId },
      include: { schedule: true },
    });

    if (!sessionType) {
      return res
        .status(404)
        .json({ success: false, error: "Session type not found" });
    }

    if (!sessionType.allowUnscheduled) {
      return res
        .status(400)
        .json({
          success: false,
          error: "This session type does not allow unscheduled sessions",
        });
    }

    const parsedDate = new Date(date + 'T' + time + ':00Z');
    const offsetMinutes = timezoneOffset || 0;
    const sessionDate = new Date(parsedDate.getTime() + offsetMinutes * 60000);

    const sessionData: any = {
      name,
      type,
      date: sessionDate,
      sessionTypeId: sessionTypeId,
      scheduleId: null,
    };

    sessionData.duration = duration || 30;
    const session = await prisma.session.create({
      data: sessionData,
      include: {
        sessionType: {
          include: {
            schedule: true,
          },
        },
        owner: true,
        users: {
          include: {
            user: true,
          },
        },
      },
    });

    await prisma.sessionLog.create({
      data: {
        sessionId: session.id,
        actorId: BigInt(req.session.userid),
        action: "session_created",
        metadata: {
          sessionType: sessionType.name,
          sessionName: name,
          type: type,
          creationType: "unscheduled",
          date: sessionDate.toISOString(),
        },
      },
    });

    try {
      const { logAudit } = await import('@/utils/logs');
      await logAudit(Number(req.query.id), Number(req.session.userid), 'session.create.unscheduled', `session:${session.id}`, { id: session.id, sessionType: sessionType.name });
    } catch (e) {}

    res.status(200).json({
      success: true,
      session: JSON.parse(
        JSON.stringify(session, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      ),
    });
  } catch (error) {
    console.error("Error creating unscheduled session:", error);
    res.status(500).json({ success: false, error: "Failed to create session" });
  }
}
