// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import prisma, { SessionType } from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

const sessionTypeCreationLimits: { [key: string]: { count: number; resetTime: number } } = {};
function checkSessionTypeCreationRateLimit(req: NextApiRequest, res: NextApiResponse): boolean {
  const workspaceId = req.query?.id || 'unknown';
  const userId = (req as any).session?.userid || 'anonymous';
  const key = `workspace:${workspaceId}:user:${userId}`;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 3;

  let entry = sessionTypeCreationLimits[key];
  if (!entry || now >= entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
    sessionTypeCreationLimits[key] = entry;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    res.status(429).json({
      success: false,
      error: 'Too many session type creation attempts. Please wait a moment before creating another session type.'
    });
    return false;
  }
  return true;
}

type Data = {
  success: boolean;
  error?: string;
  session?: SessionType;
  sessionsCreated?: number;
};

export default withPermissionCheck(handler, [
  "sessions_shift_scheduled",
  "sessions_shift_unscheduled",
  "sessions_training_scheduled",
  "sessions_training_unscheduled",
  "sessions_event_scheduled",
  "sessions_event_unscheduled",
  "sessions_other_scheduled",
  "sessions_other_unscheduled"
]);

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (!checkSessionTypeCreationRateLimit(req, res)) return;
  
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });  const { name, description, schedule, slots, statues } =
    req.body;

  if (!name)
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });

  try {
    let scheduleData = null;
    if (
      schedule?.enabled &&
      schedule.days &&
      schedule.hours !== undefined &&
      schedule.minutes !== undefined
    ) {
      scheduleData = {
        create: [
          {
            Days: schedule.days,
            Hour: schedule.hours,
            Minute: schedule.minutes,
          },
        ],
      };
    }

    const sessionType = await prisma.sessionType.create({
      data: {
        workspaceGroupId: parseInt(req.query.id as string),
        name,
        description: description || null,
        gameId: req.body.gameId ? BigInt(req.body.gameId as string) : null,
        allowUnscheduled: schedule?.allowUnscheduled || false,
        statues: statues || [],
        slots: slots || [],
        ...(scheduleData && { schedule: scheduleData }),
      },
      include: {
        schedule: true,
      },
    });

    res.status(200).json({
      success: true,
      session: JSON.parse(
        JSON.stringify(sessionType, (key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      ),
    });
  } catch (error) {
    console.error("Error creating session type:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create session type" });
  }
}
