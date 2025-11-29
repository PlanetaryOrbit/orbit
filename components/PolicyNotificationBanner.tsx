import React, { FC, useState, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { IconAlertTriangle, IconX, IconFileText } from "@tabler/icons-react";
import axios from "axios";

interface PolicyNotificationBannerProps {
	workspaceId: string;
	onPolicyClick?: (policyId: string) => void;
}

const PolicyNotificationBanner: FC<PolicyNotificationBannerProps> = ({ workspaceId, onPolicyClick }) => {
	const [urgentPolicies, setUrgentPolicies] = useState<any[]>([]);
	const [isDismissed, setIsDismissed] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		fetchUrgentPolicies();
	}, [workspaceId]);

	const fetchUrgentPolicies = async () => {
		try {
			const response = await axios.get(`/api/workspace/${workspaceId}/policies/acknowledgments`);
			const pendingPolicies = response.data.pendingPolicies || [];

			const urgent = pendingPolicies.filter((policy: any) => {
				if (!policy.acknowledgmentDeadline) return false;

				const now = new Date();
				const deadlineDate = new Date(policy.acknowledgmentDeadline);
				const timeDiff = deadlineDate.getTime() - now.getTime();
				const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

				return daysDiff <= 3;
			});

			setUrgentPolicies(urgent);
		} catch (error) {
			console.error('Failed to fetch urgent policies:', error);
		} finally {
			setIsLoading(false);
		}
	};

	if (isLoading || urgentPolicies.length === 0 || isDismissed) {
		return null;
	}

	const overdueCount = urgentPolicies.filter(policy => {
		const deadlineDate = new Date(policy.acknowledgmentDeadline);
		return new Date() > deadlineDate;
	}).length;

	const dueTodayCount = urgentPolicies.filter(policy => {
		const deadlineDate = new Date(policy.acknowledgmentDeadline);
		const today = new Date();
		return deadlineDate.toDateString() === today.toDateString();
	}).length;

	const getMessage = () => {
		if (overdueCount > 0) {
			return `${overdueCount} ${overdueCount === 1 ? 'policy is' : 'policies are'} overdue for acknowledgment`;
		} else if (dueTodayCount > 0) {
			return `${dueTodayCount} ${dueTodayCount === 1 ? 'policy is' : 'policies are'} due for acknowledgment today`;
		} else {
			return `${urgentPolicies.length} ${urgentPolicies.length === 1 ? 'policy requires' : 'policies require'} acknowledgment soon`;
		}
	};

	const getBannerColor = () => {
		if (overdueCount > 0) {
			return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
		} else if (dueTodayCount > 0) {
			return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
		} else {
			return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
		}
	};

	const getTextColor = () => {
		if (overdueCount > 0) {
			return 'text-red-800 dark:text-red-200';
		} else if (dueTodayCount > 0) {
			return 'text-amber-800 dark:text-amber-200';
		} else {
			return 'text-blue-800 dark:text-blue-200';
		}
	};

	const getIconColor = () => {
		if (overdueCount > 0) {
			return 'text-red-600 dark:text-red-400';
		} else if (dueTodayCount > 0) {
			return 'text-amber-600 dark:text-amber-400';
		} else {
			return 'text-blue-600 dark:text-blue-400';
		}
	};

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, height: 0 }}
				animate={{ opacity: 1, height: 'auto' }}
				exit={{ opacity: 0, height: 0 }}
				className={`border-l-4 p-4 mb-6 ${getBannerColor()}`}
			>
				<div className="flex items-start justify-between">
					<div className="flex items-start space-x-3">
						<IconAlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${getIconColor()}`} />
						<div className="flex-1">
							<h4 className={`text-sm font-medium ${getTextColor()}`}>
								Policy Acknowledgment Required
							</h4>
							<p className={`text-sm mt-1 ${getTextColor()}`}>
								{getMessage()}
							</p>
							{urgentPolicies.length <= 3 && (
								<div className="mt-3 space-y-1">
									{urgentPolicies.map((policy) => {
										const deadlineDate = new Date(policy.acknowledgmentDeadline);
										const isOverdue = new Date() > deadlineDate;
										const isDueToday = deadlineDate.toDateString() === new Date().toDateString();

										return (
											<div
												key={policy.id}
												className="flex items-center space-x-2 cursor-pointer hover:underline"
												onClick={() => onPolicyClick?.(policy.id)}
											>
												<IconFileText className={`w-3 h-3 ${getIconColor()}`} />
												<span className={`text-xs ${getTextColor()}`}>
													{policy.name}
													{isOverdue && " (Overdue)"}
													{isDueToday && !isOverdue && " (Due today)"}
												</span>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
					<button
						onClick={() => setIsDismissed(true)}
						className={`ml-4 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 ${getTextColor()}`}
						title="Dismiss notification"
					>
						<IconX className="w-4 h-4" />
					</button>
				</div>
			</motion.div>
		</AnimatePresence>
	);
};

export default PolicyNotificationBanner;