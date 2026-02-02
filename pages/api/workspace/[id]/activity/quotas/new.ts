// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'
import { logAudit } from '@/utils/logs';

type Data = {
	success: boolean
	error?: string
	quota?: any
}

export default withPermissionCheck(handler, 'create_quotas');

async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ success: false, error: 'Method not allowed' });
	}

	if (!req.session.userid) {
		return res.status(401).json({ success: false, error: 'Not logged in' });
	}

	const { name, type, value, roles, departments, description, sessionType } = req.body;
	const isCustom = type === "custom";
	if (!name || !type || (!isCustom && typeof value !== "number") || (!Array.isArray(roles) && !Array.isArray(departments) || (Array.isArray(roles) && Array.isArray(departments) && roles.length === 0 && departments.length === 0)) {
		return res.status(400).json({ success: false, error: "Missing or invalid data" });
	}

	try {
		const quotaData: any = {
			name,
			type,
			workspaceGroupId: parseInt(req.query.id as string),
			description: description || null,
		};
		if (!isCustom) {
			quota.value = parseInt(value);
		}

		if (sessionType && !isCustom) {
			quotaData.sessionType = sessionType;
		}

		const quota = await prisma.quota.create({
		  data: quotaData
		});
	  
		if (Array.isArray(roles) && roles.length > 0) {
		  await prisma.quotaRole.createMany({
			data: roles.map((roleId: string) => ({
			  quotaId: quota.id,
			  roleId: roleId
			}))
		  });
		}

		if (Array.isArray(departments) && departments.length > 0) {
		  await prisma.quotaDepartment.createMany({
			data: departments.map((departmentId: string) => ({
			  quotaId: quota.id,
			  departmentId: departmentId
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
			},
			quotaDepartments: {
			  include: {
				department: true
			  }
			}
		  }
		});

		try {
			await logAudit(parseInt(req.query.id as string), (req as any).session?.userid || null, 'activity.quota.create', `quota:${fullQuota?.id}`, { id: fullQuota?.id, name: fullQuota?.name, type: fullQuota?.type, value: fullQuota?.value, roles: (fullQuota?.quotaRoles || []).map((r: any) => r.role ? r.role.name : r.roleId) });
		} catch (e) {}

		return res.status(200).json({
			success: true,
			quota: JSON.parse(JSON.stringify(fullQuota, (key, value) => (typeof value === 'bigint' ? value.toString() : value)))
		});
	  } catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, error: "Something went wrong" });
	  }
	  
}
