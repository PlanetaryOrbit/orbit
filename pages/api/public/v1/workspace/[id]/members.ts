import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/utils/database"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" })

  const workspaceId = Number.parseInt(req.query.id as string)
  if (!workspaceId) return res.status(400).json({ success: false, error: "Missing workspace ID" })

  try {
    // Fetch members
    const members = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            workspaceGroupId: workspaceId,
          },
        },
      },
      select: {
        userid: true,
        username: true,
        picture: true,
        roles: {
          where: {
            workspaceGroupId: workspaceId,
          },
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    })

    const formattedMembers = members.map((member) => ({
      userId: Number(member.userid),
      username: member.username,
      thumbnail: member.picture,
      role: member.roles[0],
    }))

    return res.status(200).json({
      success: true,
      members: formattedMembers,
      total: formattedMembers.length,
    })
  } catch (error) {
    console.error("Error in public API:", error)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
