import React, { FC, useState, useEffect } from "react";
import { motion } from 'framer-motion';
import {
	IconShield,
	IconClock,
	IconCheck,
	IconAlertTriangle,
	IconFileText,
	IconChevronRight,
	IconRefresh,
	IconChartBar,
	IconUsers,
	IconPercentage
} from "@tabler/icons-react";
import axios from "axios";
import toast from "react-hot-toast";
import PolicyAcknowledgmentModal from "./PolicyAcknowledgmentModal";
import clsx from 'clsx';

interface PolicyDocument {
	id: string;
	name: string;
	content: any;
	acknowledgmentDeadline?: Date | string | null;
	isTrainingDocument: boolean;
	owner: {
		username: string;
		picture: string;
	};
}

interface ComplianceStats {
	overview: {
		totalPolicies: number;
		totalMembers: number;
		overallComplianceRate: number;
		pendingAcknowledgments: number;
		overdueAcknowledgments: number;
	};
	policyBreakdown: Array<{
		id: string;
		name: string;
		complianceRate: number;
		totalRequired: number;
		totalAcknowledged: number;
		overdueCount: number;
	}>;
}

interface UserPolicyDashboardProps {
	workspaceId: string;
	className?: string;
	currentUsername?: string;
}

const UserPolicyDashboard: FC<UserPolicyDashboardProps> = ({ workspaceId, className, currentUsername }) => {
	const [pendingPolicies, setPendingPolicies] = useState<PolicyDocument[]>([]);
	const [acknowledgedPolicies, setAcknowledgedPolicies] = useState<any[]>([]);
	const [complianceStats, setComplianceStats] = useState<ComplianceStats | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [selectedPolicy, setSelectedPolicy] = useState<PolicyDocument | null>(null);
	const [showAcknowledgmentModal, setShowAcknowledgmentModal] = useState(false);

	useEffect(() => {
		fetchPolicyStatus();
		fetchComplianceStats();
	}, [workspaceId]);

	const fetchPolicyStatus = async () => {
		try {
			const response = await axios.get(`/api/workspace/${workspaceId}/policies/acknowledgments`);
			setPendingPolicies(response.data.pendingPolicies || []);
			setAcknowledgedPolicies(response.data.acknowledgments || []);
		} catch (error) {
			console.error('Failed to fetch policy status:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchComplianceStats = async () => {
		try {
			const response = await axios.get(`/api/workspace/${workspaceId}/policies/compliance-stats`);
			if (response.data.success) {
				setComplianceStats(response.data.stats);
			}
		} catch (error) {
			console.error('Failed to fetch compliance statistics:', error);
		}
	};

	const handleAcknowledgeClick = (policy: PolicyDocument) => {
		setSelectedPolicy(policy);
		setShowAcknowledgmentModal(true);
	};

	const handlePolicyAcknowledged = () => {
		setSelectedPolicy(null);
		setShowAcknowledgmentModal(false);
		fetchPolicyStatus(); // Refresh the data
		fetchComplianceStats(); // Refresh compliance stats
		toast.success('Policy acknowledged successfully');
	};

	const getDeadlineStatus = (deadline?: Date | string | null) => {
		if (!deadline) return null;

		const now = new Date();
		const deadlineDate = new Date(deadline);
		const timeDiff = deadlineDate.getTime() - now.getTime();
		const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

		if (daysDiff < 0) {
			return { status: 'overdue', message: `Overdue by ${Math.abs(daysDiff)} days`, color: 'text-red-600 dark:text-red-400' };
		} else if (daysDiff === 0) {
			return { status: 'today', message: 'Due today', color: 'text-amber-600 dark:text-amber-400' };
		} else if (daysDiff <= 3) {
			return { status: 'soon', message: `Due in ${daysDiff} days`, color: 'text-amber-600 dark:text-amber-400' };
		} else {
			return { status: 'normal', message: `Due in ${daysDiff} days`, color: 'text-zinc-500 dark:text-zinc-400' };
		}
	};

	if (isLoading) {
		return (
			<div className={clsx("bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6", className)}>
				<div className="flex items-center justify-center py-8">
					<div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
				</div>
			</div>
		);
	}

	if (pendingPolicies.length === 0 && acknowledgedPolicies.length === 0) {
		return null;
	}

	const urgentPolicies = pendingPolicies.filter(policy => {
		const deadlineStatus = getDeadlineStatus(policy.acknowledgmentDeadline);
		return deadlineStatus?.status === 'overdue' || deadlineStatus?.status === 'today' || deadlineStatus?.status === 'soon';
	});

	return (
		<div className={clsx("bg-white dark:bg-zinc-800 rounded-lg shadow-sm", className)}>
			{/* Header */}
			<div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
							<IconShield className="w-4 h-4 text-primary" />
						</div>
						<div>
							<h3 className="text-lg font-medium text-zinc-900 dark:text-white">
								Policy Compliance
							</h3>
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								{complianceStats ? `${Math.round(complianceStats.overview.overallComplianceRate)}% overall compliance` : 'Loading compliance data...'}
							</p>
						</div>
					</div>
					<button
						onClick={() => { fetchPolicyStatus(); fetchComplianceStats(); }}
						className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
						title="Refresh"
					>
						<IconRefresh className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Compliance Overview Stats */}
			{complianceStats && (
				<div className="px-6 py-4 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border-b border-zinc-200 dark:border-zinc-700">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="text-center">
							<div className="flex items-center justify-center mb-1">
								<IconFileText className="w-4 h-4 text-primary mr-1" />
								<span className="text-lg font-bold text-zinc-900 dark:text-white">
									{complianceStats.overview.totalPolicies}
								</span>
							</div>
							<p className="text-xs text-zinc-600 dark:text-zinc-400">Total Policies</p>
						</div>
						<div className="text-center">
							<div className="flex items-center justify-center mb-1">
								<IconUsers className="w-4 h-4 text-primary mr-1" />
								<span className="text-lg font-bold text-zinc-900 dark:text-white">
									{complianceStats.overview.totalMembers}
								</span>
							</div>
							<p className="text-xs text-zinc-600 dark:text-zinc-400">Team Members</p>
						</div>
						<div className="text-center">
							<div className="flex items-center justify-center mb-1">
								<IconPercentage className="w-4 h-4 text-green-600 mr-1" />
								<span className="text-lg font-bold text-green-600 dark:text-green-400">
									{Math.round(complianceStats.overview.overallComplianceRate)}
								</span>
							</div>
							<p className="text-xs text-zinc-600 dark:text-zinc-400">Compliance Rate</p>
						</div>
						<div className="text-center">
							<div className="flex items-center justify-center mb-1">
								<IconClock className="w-4 h-4 text-amber-600 mr-1" />
								<span className="text-lg font-bold text-amber-600 dark:text-amber-400">
									{complianceStats.overview.pendingAcknowledgments}
								</span>
							</div>
							<p className="text-xs text-zinc-600 dark:text-zinc-400">Pending</p>
						</div>
					</div>
					{complianceStats.overview.overdueAcknowledgments > 0 && (
						<div className="mt-3 text-center">
							<span className="inline-flex items-center px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
								<IconAlertTriangle className="w-3 h-3 mr-1" />
								{complianceStats.overview.overdueAcknowledgments} overdue acknowledgments
							</span>
						</div>
					)}
				</div>
			)}

			{/* Policy Breakdown */}
			{complianceStats && complianceStats.policyBreakdown.length > 0 && (
				<div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
					<h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center">
						<IconChartBar className="w-4 h-4 text-primary mr-2" />
						Policy Compliance Breakdown
					</h4>
					<div className="space-y-3">
						{complianceStats.policyBreakdown.slice(0, 5).map((policy) => (
							<div key={policy.id} className="flex items-center justify-between">
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
										{policy.name}
									</p>
									<div className="flex items-center space-x-2 mt-1">
										<div className="flex-1 bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5">
											<div
												className="h-1.5 rounded-full transition-all duration-300"
												style={{
													width: `${policy.complianceRate}%`,
													backgroundColor: policy.complianceRate >= 90 ? '#10b981' :
																		 policy.complianceRate >= 70 ? '#f59e0b' : '#ef4444'
												}}
											/>
										</div>
										<span className={clsx(
											"text-xs font-medium",
											policy.complianceRate >= 90 ? "text-green-600 dark:text-green-400" :
											policy.complianceRate >= 70 ? "text-amber-600 dark:text-amber-400" :
											"text-red-600 dark:text-red-400"
										)}>
											{Math.round(policy.complianceRate)}%
										</span>
									</div>
									<p className="text-xs text-zinc-500 dark:text-zinc-400">
										{policy.totalAcknowledged} of {policy.totalRequired} acknowledged
										{policy.overdueCount > 0 && (
											<span className="text-red-600 dark:text-red-400 ml-2">
												• {policy.overdueCount} overdue
											</span>
										)}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Urgent Policies Alert */}
			{urgentPolicies.length > 0 && (
				<div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-b border-zinc-200 dark:border-zinc-700">
					<div className="flex items-start space-x-3">
						<IconAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
						<div>
							<h4 className="text-sm font-medium text-red-800 dark:text-red-200">
								Urgent Action Required
							</h4>
							<p className="text-sm text-red-700 dark:text-red-300 mt-1">
								{urgentPolicies.length} {urgentPolicies.length === 1 ? 'policy' : 'policies'} require immediate attention
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Pending Policies */}
			{pendingPolicies.length > 0 && (
				<div className="px-6 py-4">
					<h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">
						Pending Acknowledgments
					</h4>
					<div className="space-y-3">
						{pendingPolicies.map((policy) => {
							const deadlineStatus = getDeadlineStatus(policy.acknowledgmentDeadline);
							const isUrgent = deadlineStatus?.status === 'overdue' || deadlineStatus?.status === 'today';

							return (
								<motion.div
									key={policy.id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									className={clsx(
										"p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
										isUrgent
											? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
											: "border-zinc-200 dark:border-zinc-700 hover:border-primary/30"
									)}
									onClick={() => handleAcknowledgeClick(policy)}
								>
									<div className="flex items-center justify-between">
										<div className="flex items-start space-x-3 flex-1">
											<div className={clsx(
												"w-8 h-8 rounded-lg flex items-center justify-center",
												isUrgent
													? "bg-red-100 dark:bg-red-900/30"
													: "bg-primary/10"
											)}>
												<IconFileText className={clsx(
													"w-4 h-4",
													isUrgent ? "text-red-600 dark:text-red-400" : "text-primary"
												)} />
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center space-x-2">
													<h5 className="text-sm font-medium text-zinc-900 dark:text-white truncate">
														{policy.name}
													</h5>
													{policy.isTrainingDocument && (
														<span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
															Training
														</span>
													)}
												</div>
												<div className="flex items-center space-x-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
													{deadlineStatus && (
														<span className={deadlineStatus.color}>
															{deadlineStatus.message}
														</span>
													)}
												</div>
											</div>
										</div>
										<div className="flex items-center space-x-2">
											{isUrgent && (
												<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
											)}
											<IconChevronRight className="w-4 h-4 text-zinc-400" />
										</div>
									</div>
								</motion.div>
							);
						})}
					</div>
				</div>
			)}

			{/* Recently Acknowledged */}
			{acknowledgedPolicies.length > 0 && (
				<div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700">
					<h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center">
						<IconCheck className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
						Recently Acknowledged
					</h4>
					<div className="space-y-2">
						{acknowledgedPolicies.slice(0, 3).map((ack) => (
							<div key={ack.id} className="flex items-center space-x-3 py-2">
								<div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
									<IconCheck className="w-3 h-3 text-green-600 dark:text-green-400" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm text-zinc-900 dark:text-white truncate">
										{ack.name}
									</p>
									<p className="text-xs text-zinc-500 dark:text-zinc-400">
										Acknowledged {new Date(ack.acknowledgment.acknowledgedAt).toLocaleDateString()}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* No pending policies */}
			{pendingPolicies.length === 0 && acknowledgedPolicies.length > 0 && (
				<div className="px-6 py-8 text-center">
					<div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
						<IconCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
					</div>
					<h4 className="text-sm font-medium text-zinc-900 dark:text-white">All Caught Up!</h4>
					<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
						You have acknowledged all required policies
					</p>
				</div>
			)}

			{/* Policy Acknowledgment Modal */}
			{selectedPolicy && (
				<PolicyAcknowledgmentModal
					isOpen={showAcknowledgmentModal}
					onClose={() => {
						setSelectedPolicy(null);
						setShowAcknowledgmentModal(false);
					}}
					document={selectedPolicy}
					workspaceId={workspaceId}
					onAcknowledged={handlePolicyAcknowledged}
					currentUsername={currentUsername}
				/>
			)}
		</div>
	);
};

export default UserPolicyDashboard;