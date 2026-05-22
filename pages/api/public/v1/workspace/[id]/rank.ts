import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/utils/database"
import { initiateClient } from "@/utils/roblox"
import { getConfig } from "@/utils/configEngine"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return res.status(405).json({ success: false, error: "Method not allowed" })

  const workspaceId = Number.parseInt(req.query.id as string)
  if (!workspaceId) return res.status(400).json({ success: false, error: "Missing workspace ID" });

  const { roleid, userid } = req.body
  if (!userid && userid.length > 0) return res.status(400).json({ success: false, error: "Missing user ID in request body." });
  if (!roleid && roleid.length > 0) return res.status(400).json({ success: false, error: "Missing roleid in request body." })

  try {
    const config = await getConfig("roblox_opencloud", workspaceId);
    if (!config) return res.status(400).json({ success: false, error: "Opencloud keys could not be found." })
    if (!config.enabled) return res.status(400).json({ success: false, error: "Opencloud keys are disabled." });

    try {

      const Client = await initiateClient(config.key);

      const roles = await Client.groups.listGroupRoles(workspaceId.toString());
      const targetRole = roles.groupRoles.find(r => r.id === roleid);

      if (!targetRole) return res.status(400).json({ success: false, error: "Role does not exist on the group." });

      const admins = await Client.groups.listGroupMemberships(workspaceId.toString(), {
        filter: `role == 'groups/${workspaceId}/roles/${roleid}'`
      });

      if (admins.groupMemberships.find((user) => user.user == `users/${userid}`)) return res.status(400).json({ success: false, error: "User is already ranked." });

      await Client.groups.updateGroupMembership(
        workspaceId.toString(),
        userid.toString(),
        roleid.toString()
      )

      await Client.groups.updateGroupMembership(workspaceId.toString(), userid, roleid);

      return res.status(200).json({ success: true, message: "User ranked successfully."});
    } catch (err) {
      console.log(`[Ranking API]: Failed to rank user ${userid},`, err);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  } catch (error) {
    console.error("Error in public API:", error)
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
