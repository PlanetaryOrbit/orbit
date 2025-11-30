import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getConfig, setConfig } from "@/utils/configEngine";

export default withPermissionCheck(handler, "admin");

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: workspaceId } = req.query;
  if (!workspaceId || typeof workspaceId !== "string") return res.status(400).json({ success: false, error: 'Invalid workspace id' });

  const gid = parseInt(workspaceId)

  if (req.method === "GET") {
    try {
      const cfg = await getConfig("live_games", gid)
      return res.status(200).json({ success: true, games: cfg || [] })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ success: false, error: 'Failed to fetch' })
    }
  }

  if (req.method === "POST") {
    try {
      const { games } = req.body
      if (!Array.isArray(games)) return res.status(400).json({ success: false, error: 'Invalid payload' })
      // simple validation
      const sanitized = games.map((g: any) => ({ name: String(g.name || "").trim(), placeId: String(g.placeId || "").trim() }))
      await setConfig("live_games", sanitized, gid)
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ success: false, error: 'Failed to save' })
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
