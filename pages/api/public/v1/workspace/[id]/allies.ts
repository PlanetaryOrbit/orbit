import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/utils/database"
import { validateApiKey } from "@/utils/api-auth"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" })

  const apiKey = req.headers.authorization?.replace("Bearer ", "")
  if (!apiKey) return res.status(401).json({ success: false, error: "Missing API key" })

  const workspaceId = Number.parseInt(req.query.id as string)
  if (!workspaceId) return res.status(400).json({ success: false, error: "Missing workspace ID" })

  try {
    // Validate API key
    const key = await validateApiKey(apiKey, workspaceId.toString())
    if (!key) {
      return res.status(401).json({ success: false, error: "Invalid API key" })
    }

    // Fetch allies
    const allies = await prisma.ally.findMany({
      where: {
        workspaceGroupId: workspaceId,
      },
      include: {
        reps: {
          select: {
            userid: true,
            username: true,
            picture: true,
          },
        },
        allyVisits: {
          orderBy: {
            time: "desc",
          },
          take: 5,
          include: {
            host: {
              select: {
                userid: true,
                username: true,
                picture: true,
              },
            },
          },
        },
      },
    })

    const formattedAllies = allies.map((ally) => ({
      id: ally.id,
      name: ally.name,
      groupId: ally.groupId,
      icon: ally.icon,
      notes: ally.notes,
      representatives: ally.reps.map((rep) => ({
        userId: Number(rep.userid),
        username: rep.username,
        thumbnail: rep.picture,
      })),
      recentVisits: ally.allyVisits.map((visit) => ({
        id: visit.id,
        time: visit.time,
        name: visit.name,
        host: {
          userId: Number(visit.host.userid),
          username: visit.host.username,
          thumbnail: visit.host.picture,
        },
      })),
    }))

    return res.status(200).json({
      success: true,
      allies: formattedAllies,
      total: formattedAllies.length,
    })
  } catch (error) {
    console.error("Error in public API:", error)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
