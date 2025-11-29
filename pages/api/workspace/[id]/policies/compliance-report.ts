import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager';
import { getConfig } from '@/utils/configEngine';

type Data = {
	success: boolean
	error?: string
	report?: any
}

export default withPermissionCheck(handler, 'manage_policies');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

	const { id } = req.query;
	if (!id) return res.status(400).json({ success: false, error: 'Missing required fields' });

	const policiesConfig = await getConfig('policies', parseInt(id as string));
	if (!policiesConfig?.enabled) {
		return res.status(404).json({ success: false, error: 'Policies feature not enabled' });
	}

	const policyDocuments = await prisma.document.findMany({
		where: {
			workspaceGroupId: parseInt(id as string),
			requiresAcknowledgment: true
		},
		include: {
			acknowledgments: {
				include: {
					user: {
						select: {
							userid: true,
							username: true,
							picture: true
						}
					}
				}
			},
			roles: {
				include: {
					members: {
						select: {
							userid: true,
							username: true,
							picture: true
						}
					}
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

	const report = {
		totalPolicies: policyDocuments.length,
		policies: policyDocuments.map(doc => {
			const requiredUsers = new Map();
			doc.roles.forEach(role => {
				role.members.forEach(member => {
					requiredUsers.set(member.userid.toString(), member);
				});
			});

			const currentVersionAcknowledgments = doc.acknowledgments;

			const totalRequired = requiredUsers.size;
			const totalAcknowledged = currentVersionAcknowledgments.length;
			const complianceRate = totalRequired > 0 ? (totalAcknowledged / totalRequired) * 100 : 100;

			const acknowledgedUserIds = new Set(
				currentVersionAcknowledgments.map(ack => ack.userId.toString())
			);

			const pendingUsers = Array.from(requiredUsers.values()).filter(
				user => !acknowledgedUserIds.has(user.userid.toString())
			);

			const isOverdue = doc.acknowledgmentDeadline &&
				new Date() > new Date(doc.acknowledgmentDeadline) &&
				pendingUsers.length > 0;

			return {
				id: doc.id,
				name: doc.name,
				isTrainingDocument: doc.isTrainingDocument,
				acknowledgmentDeadline: doc.acknowledgmentDeadline,
				totalRequired,
				totalAcknowledged,
				complianceRate: Math.round(complianceRate * 100) / 100,
				isOverdue,
				pendingUsers: pendingUsers.map(user => ({
					userid: user.userid.toString(),
					username: user.username,
					picture: user.picture
				})),
				recentAcknowledgments: currentVersionAcknowledgments
					.sort((a, b) => new Date(b.acknowledgedAt).getTime() - new Date(a.acknowledgedAt).getTime())
					.slice(0, 5)
					.map(ack => ({
						user: {
							userid: ack.user.userid.toString(),
							username: ack.user.username,
							picture: ack.user.picture
						},
						acknowledgedAt: ack.acknowledgedAt,
						signature: ack.signature ? 'provided' : 'none'
					})),
				owner: doc.owner
			};
		})
	};

	const overallStats = {
		totalPolicies: report.totalPolicies,
		averageComplianceRate: report.policies.length > 0
			? Math.round((report.policies.reduce((sum, p) => sum + p.complianceRate, 0) / report.policies.length) * 100) / 100
			: 100,
		overdueCount: report.policies.filter(p => p.isOverdue).length,
		fullyCompliantCount: report.policies.filter(p => p.complianceRate === 100).length
	};

	res.status(200).json({
		success: true,
		report: {
			...report,
			overallStats,
			generatedAt: new Date().toISOString()
		}
	});
}