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

    // Fetch session types
    const sessionTypes = await prisma.sessionType.findMany({
      where: {
        workspaceGroupId: workspaceId,
      },
      include: {
        hostingRoles: {
          select: {
            id: true,
            name: true,
          },
        },
        schedule: true,
      },
    })

    const formattedSessionTypes = sessionTypes.map((type) => ({
      id: type.id,
      name: type.name,
      gameId: type.gameId ? Number(type.gameId) : null,
      allowUnscheduled: type.allowUnscheduled,
      slots: type.slots,
      statuses: type.statues,
      hostingRoles: type.hostingRoles.map((role) => ({
        id: role.id,
        name: role.name,
      })),
      schedules: type.schedule.map((schedule) => ({
        id: schedule.id,
        days: schedule.Days,
        hour: schedule.Hour,
        minute: schedule.Minute,
      })),
      webhookEnabled: type.webhookEnabled || false,
    }))

    return res.status(200).json({
      success: true,
      sessionTypes: formattedSessionTypes,
      total: formattedSessionTypes.length,
    })
  } catch (error) {
    console.error("Error in public API:", error)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
