import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession';
import { getConfig } from '@/utils/configEngine';

type Data = {
	success: boolean
	error?: string
	acknowledgments?: any[]
	pendingPolicies?: any[]
}

export default withSessionRoute(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

	const { id } = req.query;
	if (!id) return res.status(400).json({ success: false, error: 'Missing required fields' });
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Unauthorized' });

	const policiesConfig = await getConfig('policies', parseInt(id as string));
	if (!policiesConfig?.enabled) {
		return res.status(404).json({ success: false, error: 'Policies feature not enabled' });
	}

	const user = await prisma.user.findFirst({
		where: {
			userid: BigInt(req.session.userid)
		},
		include: {
			roles: {
				where: {
					workspaceGroupId: parseInt(id as string)
				}
			}
		}
	});

	if (!user) {
		return res.status(403).json({ success: false, error: 'Access denied' });
	}

	const userRoleIds = user.roles ? user.roles.map(role => role.id) : [];

	const policyDocuments = await prisma.document.findMany({
		where: {
			workspaceGroupId: parseInt(id as string),
			requiresAcknowledgment: true,
			OR: [
				{ roles: { none: {} } },
				...(userRoleIds.length > 0 ? [{
					roles: {
						some: {
							id: { in: userRoleIds }
						}
					}
				}] : [])
			]
		},
		include: {
			acknowledgments: {
				where: {
					userId: BigInt(req.session.userid)
				}
			},
			owner: {
				select: {
					username: true,
					picture: true
				}
			}
		}
	});

	const acknowledgedPolicies = [];
	const pendingPolicies = [];

	for (const doc of policyDocuments) {
		const hasAcknowledgment = doc.acknowledgments.length > 0;

		if (hasAcknowledgment) {
			acknowledgedPolicies.push({
				...doc,
				acknowledgment: doc.acknowledgments[0]
			});
		} else {
			pendingPolicies.push(doc);
		}
	}

	res.status(200).json({
		success: true,
		acknowledgments: JSON.parse(JSON.stringify(acknowledgedPolicies, (key, value) => (typeof value === 'bigint' ? value.toString() : value))),
		pendingPolicies: JSON.parse(JSON.stringify(pendingPolicies, (key, value) => (typeof value === 'bigint' ? value.toString() : value)))
	});
}