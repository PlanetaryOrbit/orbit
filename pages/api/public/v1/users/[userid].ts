import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/utils/database"
import { withKey } from "@/lib/withAuth"

export default withKey(handler); 

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" })

  const { userid } = req.query

  if (!userid) {
    return res.status(400).send({
      success: false,
      error: "No User ID provided."
    })
  }

  try {

    const user = await prisma.user.findFirst({
      where: {
        userid: BigInt(userid as string)
      },
      include: {
        discordUser: true,
        workspaceMemberships: true,
        ranks: true,
        inactivityNotices: true,
        activitySessions: true,
        activityHistory: true,
        googleUser: true,
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "User does not exist."
      })
    };

    return res.status(200).send({
      success: true,
      data: user
    })
  } catch (error) {
    console.error("Error in public API:", error)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
