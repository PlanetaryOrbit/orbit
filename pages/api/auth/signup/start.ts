// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
type Data = {
	success: boolean
	error?: string
	code?: string
}

export default withSessionRoute(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (req.session.userid) return res.status(400).json({ success: false, error: 'Already logged in' })
	const { username } = req.body;
	if (!username) return res.status(400).json({ success: false, error: 'Missing username' })
	const userid = await noblox.getIdFromUsername(username).catch(() => null) as number | undefined;
	if (!userid) return res.status(404).json({ success: false, error: 'Username not found' })
	const array = ['📋', '🎉', '🎂', '📆', '✔️', '📃', '👍', '➕', '📢', '🐒', '🐴', '🐑', '🐘', '🐼', '🐧', '🐦', '🐤', '🐥', '🐣', '🐔', '🐍', '🐢', '🐛', '🐝', '🐜', '📕', '📗', '📘', '📙', '📓', '📔', '📒', '📚', '📖', '🔖', '🎯', '🏈', '🏀', '⚽', '⚾', '🎾', '🎱', '🏉', '🎳', '⛳', '🚵', '🚴', '🏁', '🏇']
	const verificationCode = `🤖${Array.from({ length: 11 }, () => array[Math.floor(Math.random() * array.length)]).join('')}`;
	

	req.session.verification = {
		userid,
		verificationCode
	}
	await req.session.save()
	
	res.status(200).json({ success: true, code: verificationCode })
}
