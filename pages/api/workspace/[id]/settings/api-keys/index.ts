import type { NextApiRequest, NextApiResponse } from "next"
import { withPermissionCheck } from "@/utils/permissionsManager"
import prisma from "@/utils/database"

type Data = {
  success: boolean
  error?: string
  apiKeys?: any[]
}

export default withPermissionCheck(handler, "admin")

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (!req.session.userid) return res.status(401).json({ success: false, error: "Not authenticated" })
  if (!req.query.id) return res.status(400).json({ success: false, error: "Missing workspace ID" })

  const workspaceId = Number.parseInt(req.query.id as string)

  if (req.method === "GET") {
    try {
      const apiKeys = await prisma.apiKey.findMany({
        where: {
          workspaceGroupId: workspaceId,
        },
        select: {
          id: true,
          name: true,
          key: true,
          lastUsed: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
      const maskedKeys = apiKeys.map((key: {
        id: string
        name: string
        key: string
        lastUsed: Date | null
        createdAt: Date
        expiresAt: Date | null
        createdBy?: { userid: string }
      }) => ({
        ...key,
        key: `****${key.key.slice(-4)}`,
        createdBy: key.createdBy
          ? {
              ...key.createdBy,
              userid: Number(key.createdBy.userid),
            }
          : undefined,
      }))

      return res.status(200).json({ success: true, apiKeys: maskedKeys })
    } catch (error) {
      console.error("Error fetching API keys:", error)
      return res.status(500).json({ success: false, error: "Failed to fetch API keys" })
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" })
}
