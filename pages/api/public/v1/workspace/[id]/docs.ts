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

    // Fetch documents
    const docs = await prisma.document.findMany({
      where: {
        workspaceGroupId: workspaceId,
        requiresAcknowledgment: false,
      },
      include: {
        owner: {
          select: {
            userid: true,
            username: true,
            picture: true,
          },
        },
        roles: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    const formattedDocs = docs.map((doc) => ({
      id: doc.id,
      name: doc.name,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      author: {
        userId: Number(doc.owner.userid),
        username: doc.owner.username,
        thumbnail: doc.owner.picture,
      },
      roles: doc.roles.map((role) => ({
        id: role.id,
        name: role.name,
      })),
    }))

    return res.status(200).json({
      success: true,
      documents: formattedDocs,
      total: formattedDocs.length,
    })
  } catch (error) {
    console.error("Error in public API:", error)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
