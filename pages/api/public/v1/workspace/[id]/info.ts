import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/utils/database"
import * as noblox from "noblox.js"
import { validateApiKey } from "@/utils/api-auth"
import { getConfig } from "@/utils/configEngine"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" })

  const apiKey = req.headers.authorization?.replace("Bearer ", "")
  if (!apiKey) return res.status(401).json({ success: false, error: "Missing API key" })

  const workspaceId = Number.parseInt(req.query.id as string)
  if (!workspaceId) return res.status(400).json({ success: false, error: "Missing workspace ID" })

  try {
    const key = await validateApiKey(apiKey, workspaceId.toString());
    if (!key) {
      const secretKey = await getConfig("board_key", workspaceId);
      console.log(key)
      if (!secretKey || !secretKey.key) {
        return res.status(401).json({ success: false, error: "Invalid API key" });
      }
      if (secretKey.key != apiKey) { return res.status(401).json({ success: false, error: "Invalid API key" }); }
    }


    // Fetch workspace info
    const workspace = await prisma.workspace.findUnique({
      where: { groupId: workspaceId },
      include: {
        roles: {
          select: {
            id: true,
            name: true,
            groupRoles: true,
          },
        },
      },
    })

    if (!workspace) {
      return res.status(404).json({ success: false, error: "Workspace not found" })
    }

    const groupInfo = await noblox.getGroup(workspace.groupId)
    const logo = await noblox.getLogo(workspace.groupId, '420x420')

    return res.status(200).json({
      success: true,
      workspace: {
        groupId: workspace.groupId,
        name: groupInfo.name,
        description: groupInfo.description,
        logo: logo,
        memberCount: groupInfo.memberCount,
        roles: workspace.roles,
      },
    })
  } catch (error) {
    console.error("Error in public API:", error)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
