import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'

type ComplianceStats = {
	success: boolean
	error?: string
	stats?: {
		overview: {
			totalPolicies: number
			totalMembers: number
			overallComplianceRate: number
			pendingAcknowledgments: number
			overdueAcknowledgments: number
		}
		policyBreakdown: Array<{
			id: string
			name: string
			isTrainingDocument: boolean
			acknowledgmentDeadline?: string
			totalRequired: number
			totalAcknowledged: number
			complianceRate: number
			overdueCount: number
			recentAcknowledgments: number // last 7 days
		}>
		memberCompliance: Array<{
			userId: string
			username: string
			picture?: string
			acknowledgedPolicies: number
			pendingPolicies: number
			overduePolicies: number
			complianceRate: number
			lastAcknowledgment?: string
		}>
		trends: {
			dailyAcknowledgments: Array<{
				date: string
				count: number
			}>
			complianceOverTime: Array<{
				date: string
				rate: number
			}>
		}
	}
}

export default withPermissionCheck(handler, 'view_compliance');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<ComplianceStats>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

	const { id } = req.query;
	if (!id) return res.status(400).json({ success: false, error: 'Missing workspace ID' });

	const workspaceId = parseInt(id as string);

	try {
		// Get all policies that require acknowledgment
		const policies = await prisma.document.findMany({
			where: {
				workspaceGroupId: workspaceId,
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
				roles: true,
				departments: {
					include: {
						departmentMembers: {
							include: {
								workspaceMember: {
									select: {
										userId: true
									}
								}
							}
						}
					}
				}
			}
		});

		// Get all workspace members
		const members = await prisma.workspaceMember.findMany({
			where: {
				workspaceGroupId: workspaceId
			},
			include: {
				user: {
					select: {
						userid: true,
						username: true,
						picture: true,
						roles: {
							where: {
								workspaceGroupId: workspaceId
							}
						}
					}
				},
				departmentMembers: {
					include: {
						department: {
							select: {
								id: true
							}
						}
					}
				}
			}
		});

		// Calculate overall statistics
		const totalPolicies = policies.length;
		const totalMembers = members.length;

		// Get all acknowledgments for compliance calculations
		const allAcknowledgments = await prisma.policyAcknowledgment.findMany({
			where: {
				document: {
					workspaceGroupId: workspaceId,
					requiresAcknowledgment: true
				}
			},
			include: {
				user: {
					select: {
						userid: true,
						username: true,
						picture: true
					}
				},
				document: {
					select: {
						id: true,
						name: true,
						acknowledgmentDeadline: true
					}
				}
			},
			orderBy: {
				acknowledgedAt: 'desc'
			}
		});

		// Calculate policy breakdown
		const policyBreakdown = policies.map(policy => {
			const policyAcknowledgments = policy.acknowledgments;

			// Calculate how many members need to acknowledge this policy based on role and department assignments
			let totalRequired = 0;
			let requiredMemberIds = new Set<string>();
			const hasRoleAssignments = policy.roles.length > 0;
			const hasDepartmentAssignments = policy.departments.length > 0;
			
			if (!hasRoleAssignments && !hasDepartmentAssignments) {
				totalRequired = totalMembers;
				members.forEach(member => requiredMemberIds.add(member.userId.toString()));
			} else {
				// Count members who have at least one of the assigned roles OR are in one of the assigned departments
				const policyRoleIds = policy.roles.map(role => role.id);
				
				const departmentUserIds = new Set<string>();
				policy.departments.forEach(department => {
					department.departmentMembers.forEach(dm => {
						departmentUserIds.add(dm.workspaceMember.userId.toString());
					});
				});
				
				const requiredMembers = members.filter(member => {
					const hasRequiredRole = hasRoleAssignments && 
						member.user.roles.some(userRole => policyRoleIds.includes(userRole.id));
					
					const hasRequiredDepartment = hasDepartmentAssignments &&
						departmentUserIds.has(member.userId.toString());
					
					return hasRequiredRole || hasRequiredDepartment;
				});
				totalRequired = requiredMembers.length;
				requiredMembers.forEach(member => requiredMemberIds.add(member.userId.toString()));
			}
			const totalAcknowledged = policyAcknowledgments.filter(ack => 
				requiredMemberIds.has(ack.userId.toString())
			).length;
			const complianceRate = totalRequired > 0 ? Math.min((totalAcknowledged / totalRequired) * 100, 100) : 0;

			// Calculate overdue count
			const now = new Date();
			const isOverdue = policy.acknowledgmentDeadline && now > new Date(policy.acknowledgmentDeadline);
			const overdueCount = isOverdue ? Math.max(totalRequired - totalAcknowledged, 0) : 0;

			// Recent acknowledgments (last 7 days)
			const sevenDaysAgo = new Date();
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
			const recentAcknowledgments = policyAcknowledgments.filter(ack =>
				new Date(ack.acknowledgedAt) >= sevenDaysAgo
			).length;

			return {
				id: policy.id,
				name: policy.name,
				isTrainingDocument: policy.isTrainingDocument,
				acknowledgmentDeadline: policy.acknowledgmentDeadline?.toISOString(),
				totalRequired,
				totalAcknowledged,
				complianceRate: Math.round(complianceRate * 100) / 100,
				overdueCount,
				recentAcknowledgments
			};
		});

		// Calculate member compliance
		const memberCompliance = members.map(member => {
			const memberAcknowledgments = allAcknowledgments.filter(ack =>
				ack.userId.toString() === member.userId.toString()
			);

			// Get unique acknowledged policies
			const acknowledgedPolicyIds = new Set(memberAcknowledgments.map(ack => ack.document.id));
			const acknowledgedPolicies = acknowledgedPolicyIds.size;

			// Calculate how many policies this member needs to acknowledge based on their roles and departments
			const memberRoleIds = member.user.roles.map(role => role.id);
			const memberDepartmentIds = member.departmentMembers.map(dm => dm.department.id);
			
			const applicablePolicies = policies.filter(policy => {
				const hasRoleAssignments = policy.roles.length > 0;
				const hasDepartmentAssignments = policy.departments.length > 0;
				
				if (!hasRoleAssignments && !hasDepartmentAssignments) {
					return true;
				}
				
				const hasRequiredRole = hasRoleAssignments && 
					policy.roles.some(policyRole => memberRoleIds.includes(policyRole.id));
				
				const hasRequiredDepartment = hasDepartmentAssignments &&
					policy.departments.some(department => memberDepartmentIds.includes(department.id));
				
				return hasRequiredRole || hasRequiredDepartment;
			});
			const totalApplicablePolicies = applicablePolicies.length;

			const relevantAcknowledgedPolicies = applicablePolicies.filter(policy =>
				acknowledgedPolicyIds.has(policy.id)
			).length;

			const pendingPolicies = totalApplicablePolicies - relevantAcknowledgedPolicies;

			const overduePolicies = applicablePolicies.filter(policy => {
				const hasAcknowledged = acknowledgedPolicyIds.has(policy.id);
				const isOverdue = policy.acknowledgmentDeadline && new Date() > new Date(policy.acknowledgmentDeadline);
				return !hasAcknowledged && isOverdue;
			}).length;

			const complianceRate = totalApplicablePolicies > 0 ? (relevantAcknowledgedPolicies / totalApplicablePolicies) * 100 : 100;

			const lastAcknowledgment = memberAcknowledgments[0]?.acknowledgedAt;

			return {
				userId: member.userId.toString(),
				username: member.user.username || 'Unknown User',
				picture: member.user.picture || undefined,
				acknowledgedPolicies: relevantAcknowledgedPolicies,
				pendingPolicies,
				overduePolicies,
				complianceRate: Math.round(complianceRate * 100) / 100,
				lastAcknowledgment: lastAcknowledgment?.toISOString() || undefined
			};
		});

		const totalRequiredAcknowledgments = policyBreakdown.reduce((sum, policy) => sum + policy.totalRequired, 0);
		const totalCompletedAcknowledgments = policyBreakdown.reduce((sum, policy) => sum + policy.totalAcknowledged, 0);
		const overallComplianceRate = totalRequiredAcknowledgments > 0
			? Math.min((totalCompletedAcknowledgments / totalRequiredAcknowledgments) * 100, 100)
			: 100;

		const pendingAcknowledgments = Math.max(totalRequiredAcknowledgments - totalCompletedAcknowledgments, 0);
		const overdueAcknowledgments = policyBreakdown.reduce((sum, policy) => sum + policy.overdueCount, 0);

		// Calculate trends (last 30 days)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const dailyAcknowledgments = [];
		const complianceOverTime = [];

		for (let i = 29; i >= 0; i--) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			const dateStr = date.toISOString().split('T')[0];

			// Count acknowledgments on this day
			const dayStart = new Date(date);
			dayStart.setHours(0, 0, 0, 0);
			const dayEnd = new Date(date);
			dayEnd.setHours(23, 59, 59, 999);

			const dayAcknowledgments = allAcknowledgments.filter(ack => {
				const ackDate = new Date(ack.acknowledgedAt);
				return ackDate >= dayStart && ackDate <= dayEnd;
			}).length;

			dailyAcknowledgments.push({
				date: dateStr,
				count: dayAcknowledgments
			});

			// Calculate compliance rate up to this date
			const acknowledgementsUpToDate = allAcknowledgments.filter(ack =>
				new Date(ack.acknowledgedAt) <= dayEnd
			).length;

			const rateUpToDate = totalRequiredAcknowledgments > 0
				? Math.min((acknowledgementsUpToDate / totalRequiredAcknowledgments) * 100, 100)
				: 100;

			complianceOverTime.push({
				date: dateStr,
				rate: Math.round(rateUpToDate * 100) / 100
			});
		}

		const stats = {
			overview: {
				totalPolicies,
				totalMembers,
				overallComplianceRate: Math.round(overallComplianceRate * 100) / 100,
				pendingAcknowledgments,
				overdueAcknowledgments
			},
			policyBreakdown,
			memberCompliance: memberCompliance.sort((a, b) => a.complianceRate - b.complianceRate),
			trends: {
				dailyAcknowledgments,
				complianceOverTime
			}
		};

		return res.status(200).json({
			success: true,
			stats
		});

	} catch (error: any) {
		console.error('Failed to fetch compliance statistics:', error);
		return res.status(500).json({
			success: false,
			error: 'Failed to fetch compliance statistics'
		});
	}
}