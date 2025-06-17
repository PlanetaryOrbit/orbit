// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'

type Data = {
	success: boolean
	error?: string
	quota?: any
}

export default withPermissionCheck(handler, 'manage_activity');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ success: false, error: 'Method not allowed' });
	}

	if (!req.session.userid) {
		return res.status(401).json({ success: false, error: 'Not logged in' });
	}

	const { name, type, value, roles } = req.body;

	if (!name || !type || !value || !roles || !Array.isArray(roles)) {
		return res.status(400).json({ success: false, error: "Missing or invalid data" });
	}

	try {
		const quota = await prisma.quota.create({
		  data: {
			name,
			type,
			value: parseInt(value),
			workspaceGroupId: parseInt(req.query.id as string)
		  }
		});
	  
		if (Array.isArray(roles) && roles.length > 0) {
		  await prisma.quotaRole.createMany({
			data: roles.map((roleId: string) => ({
			  quotaId: quota.id,
			  roleId: roleId
			}))
		  });
		}
	  
		const fullQuota = await prisma.quota.findUnique({
		  where: { id: quota.id },
		  include: {
			quotaRoles: {
			  include: {
				role: true
			  }
			}
		  }
		});
	  
		return res.status(200).json({
		  success: true,
		  quota: JSON.parse(JSON.stringify(fullQuota, (key, value) => (typeof value === 'bigint' ? value.toString() : value)))
		});
	  } catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, error: "Something went wrong" });
	  }
	  
}
