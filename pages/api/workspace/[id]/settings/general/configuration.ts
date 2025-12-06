import type { NextApiRequest, NextApiResponse } from 'next'
import { getConfig } from '@/utils/configEngine'
import { withSessionRoute } from '@/lib/withSession'

type Data = {
  success: boolean
  error?: string
  value?: any
}

/* provide configuration for sidebar: 
	- guides
	- ally
	- sessions
	- notices
	- leaderboard
	- policies
*/

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
	if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });
	if(!req.session.userid) return res.status(401).json({ success: false, error: "Not logged in" });

	const configuration = await Promise.all([
		getConfig("guides", parseInt(req.query.id as string)),
		getConfig("allies", parseInt(req.query.id as string)),
		getConfig("sessions", parseInt(req.query.id as string)),
		getConfig("notices", parseInt(req.query.id as string)),
		getConfig("leaderboard", parseInt(req.query.id as string)),
		getConfig("policies", parseInt(req.query.id as string)),
	])

	const keys = ["guides", "allies", "sessions", "notices", "leaderboard", "policies"];
	return res.status(200).json({ 
		success: true, 
		value: configuration.reduce((acc, curr, index) => {
			acc[keys[index]] = curr;
			return acc;
		}, {} as Record<string, any>) 
	})
}

export default withSessionRoute(handler);