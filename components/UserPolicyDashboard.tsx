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
	IconPercentage,
	IconExternalLink,
	IconX
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
	const [viewingAcknowledgedPolicy, setViewingAcknowledgedPolicy] = useState<any>(null);
	const [showViewModal, setShowViewModal] = useState(false);

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

	const urgentPolicies = pendingPolicies.filter(policy => {
		const deadlineStatus = getDeadlineStatus(policy.acknowledgmentDeadline);
		return deadlineStatus?.status === 'overdue' || deadlineStatus?.status === 'today' || deadlineStatus?.status === 'soon';
	});

	const totalPolicies = pendingPolicies.length + acknowledgedPolicies.length;

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
								My Policies
							</h3>
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								{totalPolicies === 0 ? 'No policies assigned' : 
								 pendingPolicies.length === 0 ? 'All policies acknowledged' :
								 `${pendingPolicies.length} pending, ${acknowledgedPolicies.length} acknowledged`}
							</p>
						</div>
					</div>
					<div className="flex items-center space-x-2">
						<div className="text-right mr-2">
							<p className="text-2xl font-bold text-zinc-900 dark:text-white">{totalPolicies}</p>
							<p className="text-xs text-zinc-500 dark:text-zinc-400">Total Policies</p>
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
			</div>

			{/* Empty State */}
			{totalPolicies === 0 && (
				<div className="px-6 py-12 text-center">
					<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
						<IconFileText className="w-8 h-8 text-zinc-400" />
					</div>
					<h4 className="text-base font-medium text-zinc-900 dark:text-white mb-2">No Policies Assigned</h4>
					<p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
						You don't have any policies to review at this time. Policies will appear here when they are assigned to your role.
					</p>
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
					<h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center justify-between">
						<span className="flex items-center">
							<IconCheck className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
							Acknowledged Policies
						</span>
						<span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
							{acknowledgedPolicies.length} total
						</span>
					</h4>
					<div className="space-y-2 max-h-64 overflow-y-auto">
						{acknowledgedPolicies.map((ack) => (
							<div 
								key={ack.id} 
								className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer group"
								onClick={() => {
									setViewingAcknowledgedPolicy(ack);
									setShowViewModal(true);
								}}
							>
								<div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
									<IconCheck className="w-3 h-3 text-green-600 dark:text-green-400" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm text-zinc-900 dark:text-white truncate">
										{ack.name}
									</p>
									<p className="text-xs text-zinc-500 dark:text-zinc-400">
										Signed {new Date(ack.acknowledgment.acknowledgedAt).toLocaleDateString('en-US', { 
											month: 'short', 
											day: 'numeric', 
											year: 'numeric',
											hour: '2-digit',
											minute: '2-digit'
										})}
									</p>
								</div>
								<IconChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
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

			{/* View Acknowledged Policy Modal */}
			{viewingAcknowledgedPolicy && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
					>
						{/* Modal Header */}
						<div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
							<div className="flex items-center space-x-3">
								<div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
									<IconCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
								</div>
								<div>
									<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
										{viewingAcknowledgedPolicy.name}
									</h3>
									<p className="text-xs text-zinc-500 dark:text-zinc-400">
										Acknowledged on {new Date(viewingAcknowledgedPolicy.acknowledgment.acknowledgedAt).toLocaleDateString('en-US', { 
											month: 'long', 
											day: 'numeric', 
											year: 'numeric',
											hour: '2-digit',
											minute: '2-digit'
										})}
									</p>
								</div>
							</div>
							<button
								onClick={() => {
									setViewingAcknowledgedPolicy(null);
									setShowViewModal(false);
								}}
								className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
							>
								<IconX className="w-5 h-5 text-zinc-500" />
							</button>
						</div>

						{/* Modal Content */}
						<div className="flex-1 overflow-y-auto px-6 py-4">
							{/* External URL */}
							{viewingAcknowledgedPolicy.content && 
							 typeof viewingAcknowledgedPolicy.content === 'object' && 
							 viewingAcknowledgedPolicy.content.external ? (
								<div className="text-center py-8">
									<div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
										<IconExternalLink className="w-6 h-6 text-primary" />
									</div>
									<h4 className="text-base font-medium text-zinc-900 dark:text-white mb-2">
										External Policy Document
									</h4>
									<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
										This policy is hosted externally
									</p>
									<a
										href={viewingAcknowledgedPolicy.content.url}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
									>
										<IconExternalLink className="w-4 h-4 mr-2" />
										Open Policy Document
									</a>
								</div>
							) : (
								<div className="prose prose-sm dark:prose-invert max-w-none">
									{typeof viewingAcknowledgedPolicy.content === 'string' ? (
										<div className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
											{viewingAcknowledgedPolicy.content}
										</div>
									) : (
										<div className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
											{JSON.stringify(viewingAcknowledgedPolicy.content, null, 2)}
										</div>
									)}
								</div>
							)}

							{/* Acknowledgment Details */}
							<div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
								<h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">
									Acknowledgment Details
								</h4>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-zinc-500 dark:text-zinc-400">Signed by:</span>
										<span className="text-zinc-900 dark:text-white font-medium">
											{currentUsername || 'You'}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-zinc-500 dark:text-zinc-400">Date & Time:</span>
										<span className="text-zinc-900 dark:text-white font-medium">
											{new Date(viewingAcknowledgedPolicy.acknowledgment.acknowledgedAt).toLocaleString('en-US', {
												dateStyle: 'long',
												timeStyle: 'short'
											})}
										</span>
									</div>
									{viewingAcknowledgedPolicy.acknowledgment.signature && (
										<div className="flex justify-between">
											<span className="text-zinc-500 dark:text-zinc-400">Signature:</span>
											<span className="text-zinc-900 dark:text-white font-medium italic">
												{viewingAcknowledgedPolicy.acknowledgment.signature}
											</span>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Modal Footer */}
						<div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-end">
							<button
								onClick={() => {
									setViewingAcknowledgedPolicy(null);
									setShowViewModal(false);
								}}
								className="px-4 py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
							>
								Close
							</button>
						</div>
					</motion.div>
				</div>
			)}
		</div>
	);
};

export default UserPolicyDashboard;