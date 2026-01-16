import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/utils/database"
import { withPermissionCheck } from "@/utils/permissionsManager"

export default withPermissionCheck(handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: workspaceId, sessionId, startTime, endTime } = req.query

  if (!workspaceId || !sessionId || !startTime || !endTime) {
    return res.status(400).json({ message: "Missing required parameters" })
  }

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    const sessionStart = new Date(startTime as string)
    const sessionEnd = new Date(endTime as string)
    const concurrentSessions = await prisma.activitySession.findMany({
      where: {
        workspaceGroupId: parseInt(workspaceId as string),
        id: {
          not: sessionId as string,
        },
        archived: { not: true },
        OR: [
          {
            startTime: {
              lte: sessionStart,
            },
            endTime: {
              gte: sessionStart,
            },
          },
          {
            startTime: {
              gte: sessionStart,
              lte: sessionEnd,
            },
          },
          {
            endTime: {
              gte: sessionStart,
              lte: sessionEnd,
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            userid: true,
            username: true,
            picture: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    })

    const concurrentUsers = concurrentSessions.map((session) => ({
      userId: session.userId.toString(),
      username: session.user?.username || "Unknown User",
      picture: session.user?.picture || null,
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.endTime 
        ? Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))
        : null,
      overlapStart: new Date(Math.max(sessionStart.getTime(), new Date(session.startTime).getTime())),
      overlapEnd: session.endTime 
        ? new Date(Math.min(sessionEnd.getTime(), new Date(session.endTime).getTime()))
        : sessionEnd,
    }))

    const uniqueUsersMap = new Map()
    concurrentUsers.forEach((user) => {
      if (!uniqueUsersMap.has(user.userId)) {
        uniqueUsersMap.set(user.userId, user)
      }
    })
    const uniqueUsers = Array.from(uniqueUsersMap.values())

    return res.status(200).json(
      JSON.parse(
        JSON.stringify(
          {
            users: uniqueUsers,
            totalConcurrent: uniqueUsers.length,
          },
          (key, value) =>
            typeof value === "bigint" ? value.toString() : value
        )
      )
    )
  } catch (error) {
    console.error("Error fetching concurrent users:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}