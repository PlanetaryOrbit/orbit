// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma, {role} from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'
type Data = {
	success: boolean
	error?: string
	roles?: role[]
}

export default withPermissionCheck(handler, 'admin');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })
	const workspaceId = BigInt(req.query.id as string);
	const roles = await prisma.role.findMany({
		where: {
			workspaceGroupId: Number(workspaceId)
		}
	});
	
	res.status(200).json({ success: true, roles })
}
