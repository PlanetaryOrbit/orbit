import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/utils/database"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" })

  const apiKey = req.headers.authorization?.replace("Bearer ", "")
  if (!apiKey) return res.status(401).json({ success: false, error: "Missing API key" })

  const workspaceId = Number.parseInt(req.query.id as string)
  if (!workspaceId) return res.status(400).json({ success: false, error: "Missing workspace ID" })

  const { startDate, endDate, userId } = req.query

  try {
    // Validate API key
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
    })

    if (!key || key.workspaceGroupId !== workspaceId) {
      return res.status(401).json({ success: false, error: "Invalid API key" })
    }

    // Check if key is expired
    if (key.expiresAt && new Date() > key.expiresAt) {
      return res.status(401).json({ success: false, error: "API key expired" })
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsed: new Date() },
    })

    // Build query filters
    const where: any = {
      workspaceGroupId: workspaceId,
    }

    if (userId) {
      where.userId = BigInt(userId as string)
    }

    if (startDate || endDate) {
      where.startTime = {}
      if (startDate) where.startTime.gte = new Date(startDate as string)
      if (endDate) where.startTime.lte = new Date(endDate as string)
    }

    // Fetch activity sessions
    const sessions = await prisma.activitySession.findMany({
      where: { ...where, archived: { not: true } },
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
        startTime: "desc",
      },
      take: 100, // Limit results
    })

    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      userId: Number(session.userId),
      username: session.user.username,
      active: session.active,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.endTime ? Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000) : null,
      messages: session.messages,
    }))

    return res.status(200).json({
      success: true,
      sessions: formattedSessions,
      total: formattedSessions.length,
    })
  } catch (error) {
    console.error("Error in public API:", error)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
