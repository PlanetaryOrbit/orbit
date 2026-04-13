import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/utils/database"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" })

  const apiKey = req.headers.authorization?.replace("Bearer ", "")
  if (!apiKey) return res.status(401).json({ success: false, error: "Missing API key" })

  try {
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        createdBy: {
          include: {
            workspaceMemberships: true
          }
        }
      }
    })

    if (!key) return res.status(401).json({ success: false, error: "Invalid API key" })
    if (key.expiresAt && new Date() > key.expiresAt) {
      return res.status(401).json({ success: false, error: "API key expired" })
    }

    const membership = key.createdBy.workspaceMemberships.find(
      (m) => m.workspaceGroupId === key.workspaceGroupId
    )
    const isAdmin = membership?.isAdmin ?? false

    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsed: new Date() },
    })

    const keys = await prisma.apiKey.findMany({
      where: { workspaceGroupId: key.workspaceGroupId }
    })

    const sanitizedKeys = keys.map((k) => ({
      ...k,
      key: isAdmin ? k.key : k.key.slice(0, 8) + "••••••••••••••••••••",
      createdById: k.createdById.toString(),
    }))

    return res.status(200).json({ success: true, data: sanitizedKeys })
  } catch (error) {
    console.error("Error in public API:", error)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}