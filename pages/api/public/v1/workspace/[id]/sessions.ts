import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/utils/database"
import { validateApiKey } from "@/utils/api-auth"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" })

  const apiKey = req.headers.authorization?.replace("Bearer ", "")
  if (!apiKey) return res.status(401).json({ success: false, error: "Missing API key" })

  const workspaceId = Number.parseInt(req.query.id as string)
  if (!workspaceId) return res.status(400).json({ success: false, error: "Missing workspace ID" })

  const { upcoming, past, limit = "20", type } = req.query

  try {
    // Validate API key
    const key = await validateApiKey(apiKey, workspaceId.toString())
    if (!key) {
      return res.status(401).json({ success: false, error: "Invalid API key" })
    }

    // Build query filters
    const where: any = {
      sessionType: {
        workspaceGroupId: workspaceId,
      },
    }

    // Filter by session type if provided
    if (type) {
      where.sessionTypeId = type as string
    }

    // Filter by upcoming or past
    if (upcoming === "true") {
      where.date = {
        gte: new Date(),
      }
    } else if (past === "true") {
      where.date = {
        lt: new Date(),
      }
    }

    // Fetch sessions
    const sessions = await prisma.session.findMany({
      where,
      include: {
        owner: {
          select: {
            userid: true,
            username: true,
            picture: true,
          },
        },
        sessionType: {
          select: {
            id: true,
            name: true,
            gameId: true,
            slots: true,
          },
        },
        users: {
          include: {
            user: {
              select: {
                userid: true,
                username: true,
                picture: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: upcoming === "true" ? "asc" : "desc",
      },
      take: Number(limit),
    })

    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      date: session.date,
      startedAt: session.startedAt,
      ended: session.ended,
      type: {
        id: session.sessionType.id,
        name: session.sessionType.name,
        gameId: session.sessionType.gameId ? Number(session.sessionType.gameId) : null,
      },
      host: session.owner
        ? {
            userId: Number(session.owner.userid),
            username: session.owner.username,
            thumbnail: session.owner.picture,
          }
        : null,
      participants: session.users.map((user) => ({
        userId: Number(user.user.userid),
        username: user.user.username,
        thumbnail: user.user.picture,
        slot: user.slot,
        role: user.roleID,
      })),
      status: session.ended
        ? "ended"
        : session.startedAt
          ? "in-progress"
          : session.date < new Date()
            ? "missed"
            : "scheduled",
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
