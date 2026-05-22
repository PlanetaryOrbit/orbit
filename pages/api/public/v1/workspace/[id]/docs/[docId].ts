import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/utils/database"
import { withKey } from "@/lib/withAuth"

export default withKey(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" })

  const workspaceId = Number.parseInt(req.query.id as string)
  if (!workspaceId) return res.status(400).json({ success: false, error: "Missing workspace ID" })

  const { docId } = req.query
  if (!docId) return res.status(400).json({ success: false, error: "Missing document ID" })

  try {
    // Fetch document
    const doc = await prisma.document.findFirst({
      where: {
        id: docId as string,
        workspaceGroupId: workspaceId,
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
    })

    if (!doc) {
      return res.status(404).json({ success: false, error: "Document not found" })
    }

    return res.status(200).json({
      success: true,
      document: {
        id: doc.id,
        name: doc.name,
        content: doc.content,
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
      },
    })
  } catch (error) {
    console.error("Error in public API:", error)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
