import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

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
  sessionsCreated?: number;
  sessions?: any[];
};

export default withPermissionCheck(handler, "sessions_scheduled");

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (!checkSessionCreationRateLimit(req, res)) return;

  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const { sessionTypeId, name, type, schedule, timezoneOffset, duration } = req.body;

  if (!sessionTypeId || !name || !type || !schedule) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  const { days, hours, minutes, frequency, date } = schedule;
  if (!days || hours === undefined || minutes === undefined) {
    return res
      .status(400)
      .json({ success: false, error: "Missing schedule details" });
  }

  const validTypes = ["shift", "training", "event", "other"];
  if (!validTypes.includes(type)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid session type" });
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

    const sessionsToCreate = [];
    const currentDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(currentDate.getFullYear() + 1);

    let intervalDays = 7;
    if (frequency === "biweekly") {
      intervalDays = 14;
    } else if (frequency === "monthly") {
      intervalDays = 30;
    }

    const selectedDays = Array.isArray(days) ? days : [days];

    // Create a schedule record for this specific time pattern
    // This schedule record represents the pattern for all sessions at this hour:minute on the selected days
    const patternSchedule = await prisma.schedule.create({
      data: {
        Days: selectedDays,
        Hour: hours,
        Minute: minutes,
        sessionTypeId: sessionType.id,
      },
    });

    for (const dayOfWeek of selectedDays) {
      const today = new Date();
      const currentDay = today.getDay();
      let daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
      if (daysUntilTarget === 0) {
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hours, minutes, 0, 0);
        if (today.getTime() >= scheduledTime.getTime()) {
          daysUntilTarget = 7;
        }
      }
      
      const firstOccurrence = new Date(today);
      firstOccurrence.setDate(today.getDate() + daysUntilTarget);
      firstOccurrence.setUTCHours(0, 0, 0, 0);

      let sessionCount = 0;
      let maxSessions;
      if (frequency === "monthly") {
        maxSessions = 12;
      } else if (frequency === "biweekly") {
        maxSessions = 26;
      } else {
        maxSessions = 52;
      }

      while (sessionCount < maxSessions) {
        const sessionDate = new Date(firstOccurrence);
        sessionDate.setDate(firstOccurrence.getDate() + (sessionCount * intervalDays));
        
        const localDateStr = sessionDate.toISOString().split('T')[0];
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const localDateTime = new Date(localDateStr + 'T' + timeStr + ':00');
        const offsetMinutes = timezoneOffset || 0;
        const utcSessionDate = new Date(localDateTime.getTime() + (offsetMinutes * 60000));

        if (utcSessionDate >= currentDate && utcSessionDate <= endDate) {
          const sessionData: any = {
            date: utcSessionDate,
            sessionTypeId: sessionType.id,
            scheduleId: patternSchedule.id,
            name: name,
            type: type,
          };
          
          sessionData.duration = duration || 30;
          sessionsToCreate.push(sessionData);
        }
        sessionCount++;
      }
    }

    if (sessionsToCreate.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid session dates found",
      });
    }

    await prisma.session.createMany({
      data: sessionsToCreate,
    });

    const createdSessions = await prisma.session.findMany({
      where: {
        sessionTypeId: sessionType.id,
        date: {
          in: sessionsToCreate.map((s) => s.date),
        },
      },
      include: {
        sessionType: true,
        owner: true,
        users: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    const logEntries = createdSessions.map(session => ({
      sessionId: session.id,
      actorId: BigInt(req.session.userid),
      action: "session_created",
      metadata: {
        sessionType: sessionType.name,
        sessionName: name,
        type: type,
        creationType: "scheduled",
        frequency: frequency,
        date: session.date.toISOString(),
        scheduleId: session.scheduleId,
      },
    }));

    await prisma.sessionLog.createMany({
      data: logEntries,
    });

    try {
      const { logAudit } = await import('@/utils/logs');
      await logAudit(Number(req.query.id), Number(req.session.userid), 'session.create.scheduled', `session_bulk:${sessionType.id}`, { count: createdSessions.length, sessionType: sessionType.name });
    } catch (e) {}

    res.status(200).json({
      success: true,
      sessionsCreated: sessionsToCreate.length,
      sessions: JSON.parse(
        JSON.stringify(createdSessions, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      ),
    });
  } catch (error) {
    console.error("Error creating scheduled sessions:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create scheduled sessions" });
  }
}
