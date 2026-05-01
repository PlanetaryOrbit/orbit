import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/utils/database"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" })

  const apiKey = req.headers.authorization?.replace("Bearer ", "")
  if (!apiKey) return res.status(401).json({ success: false, error: "Missing API key" })

  const { userId } = req.query

  if (!userId) {
    return res.status(400).send({
      success: false,
      error: "No User ID provided."
    })
  }

  try {
    // Validate API key
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
    })

    if (!key) {
      return res.status(401).json({ success: false, error: "Invalid API key" })
    }

    // Check if key is expired
    if (key.expiresAt && new Date() > key.expiresAt) {
      return res.status(401).json({ success: false, error: "API key expired" })
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsed: new Date() },
    })

    const user = await prisma.user.findFirst({
      where: {
        userid: BigInt(userId as string)
      },
      include: {
        discordUser: true,
        workspaceMemberships: true,
        roles: true
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
