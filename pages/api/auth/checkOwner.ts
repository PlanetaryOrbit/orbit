import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/utils/database"
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth"

type Data = {
  success: boolean
  error?: string
  isOwner?: boolean
}

export default withAuth(handler)

export async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" })
  if (!req.auth.session?.userId) return res.status(401).json({ success: false, error: "Not logged in" })

  try {
    // Check if the user is the owner of any workspace
    const user = await prisma.user.findUnique({
      where: {
        userid: req.auth.userId,
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
