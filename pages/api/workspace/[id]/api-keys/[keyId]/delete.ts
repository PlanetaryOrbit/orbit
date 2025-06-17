import type { NextApiRequest, NextApiResponse } from "next"
import { withPermissionCheck } from "@/utils/permissionsManager"
import prisma from "@/utils/database"

type Data = {
  success: boolean
  error?: string
}

export default withPermissionCheck(handler, "admin")

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "DELETE") return res.status(405).json({ success: false, error: "Method not allowed" })
  if (!req.session.userid) return res.status(401).json({ success: false, error: "Not authenticated" })
  if (!req.query.id || !req.query.keyId)
    return res.status(400).json({ success: false, error: "Missing required parameters" })

  const workspaceId = Number.parseInt(req.query.id as string)
  const keyId = req.query.keyId as string

  try {
    // Verify the API key belongs to this workspace
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        workspaceGroupId: workspaceId,
      },
    })

    if (!apiKey) {
      return res.status(404).json({ success: false, error: "API key not found" })
    }

    await prisma.apiKey.delete({
      where: {
        id: keyId,
      },
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error("Error deleting API key:", error)
    return res.status(500).json({ success: false, error: "Failed to delete API key" })
  }
}