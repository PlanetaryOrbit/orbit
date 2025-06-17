import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/utils/database"
import { validateApiKey } from "@/utils/api-auth"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" })

  const apiKey = req.headers.authorization?.replace("Bearer ", "")
  if (!apiKey) return res.status(401).json({ success: false, error: "Missing API key" })

  const workspaceId = Number.parseInt(req.query.id as string)
  if (!workspaceId) return res.status(400).json({ success: false, error: "Missing workspace ID" })

  const { userId } = req.query
  if (!userId) return res.status(400).json({ success: false, error: "Missing user ID" })

  const { startDate, endDate, limit = "50" } = req.query

  try {
    // Validate API key
    const key = await validateApiKey(apiKey, workspaceId.toString())
    if (!key) {
      return res.status(401).json({ success: false, error: "Invalid API key" })
    }

    // Check if user exists and has a role in this workspace
    const user = await prisma.user.findFirst({
      where: {
        userid: BigInt(userId as string),
        roles: {
          some: {
            workspaceGroupId: workspaceId,
          },
        },
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: workspaceId,
          },
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    })

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found in this workspace" })
    }

    // Build query filters
    const where: any = {
      workspaceGroupId: workspaceId,
      userId: BigInt(userId as string),
    }

    if (startDate || endDate) {
      where.startTime = {}
      if (startDate) where.startTime.gte = new Date(startDate as string)
      if (endDate) where.startTime.lte = new Date(endDate as string)
    }

    // Fetch activity sessions
    const sessions = await prisma.activitySession.findMany({
      where,
      orderBy: {
        startTime: "desc",
      },
      take: Number(limit),
    })

    // Calculate total activity time
    const totalActivityTime = sessions.reduce((total, session) => {
      if (session.endTime) {
        const duration = Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000)
        return total + duration
      }
      return total
    }, 0)

    // Calculate average session length
    const completedSessions = sessions.filter((session) => session.endTime)
    const averageSessionLength =
      completedSessions.length > 0
        ? completedSessions.reduce((total, session) => {
            const duration = Math.floor((session.endTime!.getTime() - session.startTime.getTime()) / 1000)
            return total + duration
          }, 0) / completedSessions.length
        : 0

    // Format sessions
    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      active: session.active,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.endTime ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000) : null,
      messages: session.messages,
      universeId: session.universeId ? Number(session.universeId) : null,
    }))

    // Get inactivity notices
    const notices = await prisma.inactivityNotice.findMany({
      where: {
        workspaceGroupId: workspaceId,
        userId: BigInt(userId as string),
      },
      orderBy: {
        startTime: "desc",
      },
      take: 10,
    })

    const formattedNotices = notices.map((notice) => ({
      id: notice.id,
      startTime: notice.startTime,
      endTime: notice.endTime,
      reason: notice.reason,
      approved: notice.approved,
      reviewed: notice.reviewed,
      revoked: notice.revoked,
    }))

    return res.status(200).json({
      success: true,
      user: {
        userId: Number(user.userid),
        username: user.username,
        thumbnail: user.picture,
        role: user.roles[0],
      },
      activity: {
        sessions: formattedSessions,
        totalSessions: formattedSessions.length,
        totalActivityTime,
        averageSessionLength,
        notices: formattedNotices,
      },
    })
  } catch (error) {
    console.error("Error in public API:", error)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
