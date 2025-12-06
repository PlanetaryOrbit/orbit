import type { NextApiRequest, NextApiResponse } from "next"
import { withSessionRoute } from "@/lib/withSession"
import prisma from "@/utils/database"

type Data = {
  success: boolean
  error?: string
  isOwner?: boolean
}

export default withSessionRoute(handler)

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" })
  if (!req.session.userid) return res.status(401).json({ success: false, error: "Not logged in" })

  try {
    // Check if the user is the owner of any workspace
    const user = await prisma.user.findUnique({
      where: {
        userid: req.session.userid,
      },
      select: {
        isOwner: true,
      },
    })

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" })
    }
	

    return res.status(200).json({ success: true, isOwner: user.isOwner || false })
  } catch (error) {
    console.error("Error checking workspace ownership:", error)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
