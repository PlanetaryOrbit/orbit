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

  try {
    const key = await validateApiKey(apiKey, workspaceId.toString())
    if (!key) {
      return res.status(401).json({ success: false, error: "Invalid API key" })
    }

    const userNotes = await prisma.userBook.findMany({
      where: {
        userId: Number(userId)
      }
    });

    return res.status(200).json({ success: true, data: userNotes})
  } catch (error) {
    console.error("Error in public API:", error)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
