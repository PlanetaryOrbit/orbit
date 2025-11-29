import React, { FC, useState, useEffect } from "react";
import { motion } from 'framer-motion';
import {
	IconShield,
	IconUsers,
	IconFileText,
	IconAlertTriangle,
	IconTrendingUp,
	IconTrendingDown,
	IconClock,
	IconCheck,
	IconRefresh,
	IconChevronRight
} from "@tabler/icons-react";
import axios from "axios";
import clsx from 'clsx';
import { useRouter } from 'next/router';

interface ComplianceOverview {
	overview: {
		totalPolicies: number;
		totalMembers: number;
		overallComplianceRate: number;
		pendingAcknowledgments: number;
		overdueAcknowledgments: number;
	};
	trends: {
		complianceOverTime: Array<{
			date: string;
			rate: number;
		}>;
	};
	topNonCompliantPolicies: Array<{
		id: string;
		name: string;
		complianceRate: number;
		overdueCount: number;
	}>;
}

interface ComplianceOverviewWidgetProps {
	workspaceId: string;
	className?: string;
}

const ComplianceOverviewWidget: FC<ComplianceOverviewWidgetProps> = ({ workspaceId, className }) => {
	const [overview, setOverview] = useState<ComplianceOverview | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const router = useRouter();

	useEffect(() => {
		fetchComplianceOverview();
	}, [workspaceId]);

	const fetchComplianceOverview = async () => {
		if (!refreshing) setIsLoading(true);
		setRefreshing(true);
		try {
			const response = await axios.get(`/api/workspace/${workspaceId}/policies/compliance-stats`);
			if (response.data.success) {
				const stats = response.data.stats;
				const topNonCompliantPolicies = stats.policyBreakdown
					.sort((a: any, b: any) => a.complianceRate - b.complianceRate)
					.slice(0, 3)
					.map((policy: any) => ({
						id: policy.id,
						name: policy.name,
						complianceRate: policy.complianceRate,
						overdueCount: policy.overdueCount
					}));

				setOverview({
					overview: stats.overview,
					trends: stats.trends,
					topNonCompliantPolicies
				});
			}
		} catch (error) {
			console.error('Failed to fetch compliance overview:', error);
		} finally {
			setIsLoading(false);
			setRefreshing(false);
		}
	};

	const getComplianceStatus = (rate: number) => {
		if (rate >= 95) return { status: 'excellent', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' };
		if (rate >= 85) return { status: 'good', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' };
		if (rate >= 70) return { status: 'warning', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20' };
		return { status: 'critical', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' };
	};

	const getTrend = () => {
		if (!overview?.trends.complianceOverTime.length) return null;
		const recent = overview.trends.complianceOverTime.slice(-7);
		if (recent.length < 2) return null;

		const current = recent[recent.length - 1].rate;
		const previous = recent[0].rate;
		const change = current - previous;

		return {
			change: Math.abs(change),
			isPositive: change > 0,
			isNeutral: Math.abs(change) < 1
		};
	};

	const handleViewDetails = () => {
		router.push(`/workspace/${workspaceId}/policies`);
	};

	if (isLoading) {
		return (
			<div className={clsx("bg-white dark:bg-zinc-800 rounded-lg p-6", className)}>
				<div className="flex items-center justify-center py-12">
					<div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
				</div>
			</div>
		);
	}

	if (!overview) {
		return (
			<div className={clsx("bg-white dark:bg-zinc-800 rounded-lg p-6 text-center", className)}>
				<IconShield className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
				<p className="text-sm text-zinc-500 dark:text-zinc-400">No compliance data available</p>
			</div>
		);
	}

	const complianceStatus = getComplianceStatus(overview.overview.overallComplianceRate);
	const trend = getTrend();

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className={clsx("bg-white dark:bg-zinc-800 rounded-lg overflow-hidden", className)}
		>
			{/* Header */}
			<div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
							<IconShield className="w-5 h-5 text-primary" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
								Compliance Overview
							</h3>
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								Workspace policy compliance status
							</p>
						</div>
					</div>
					<button
						onClick={fetchComplianceOverview}
						disabled={refreshing}
						className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
						title="Refresh"
					>
						<IconRefresh className={clsx("w-4 h-4", refreshing && "animate-spin")} />
					</button>
				</div>
			</div>

			{/* Main Compliance Rate */}
			<div className={clsx("px-6 py-6", complianceStatus.bgColor)}>
				<div className="text-center">
					<div className="flex items-center justify-center mb-2">
						<span className={clsx("text-3xl font-bold", complianceStatus.color)}>
							{Math.round(overview.overview.overallComplianceRate)}%
						</span>
						{trend && !trend.isNeutral && (
							<div className={clsx("flex items-center ml-2 text-sm",
								trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
							)}>
								{trend.isPositive ? (
									<IconTrendingUp className="w-4 h-4 mr-1" />
								) : (
									<IconTrendingDown className="w-4 h-4 mr-1" />
								)}
								{trend.change.toFixed(1)}%
							</div>
						)}
					</div>
					<p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
						Overall Compliance Rate
					</p>

					{/* Quick Stats Grid */}
					<div className="grid grid-cols-3 gap-4">
						<div className="text-center">
							<div className="flex items-center justify-center mb-1">
								<IconFileText className="w-4 h-4 text-zinc-500 mr-1" />
								<span className="text-lg font-semibold text-zinc-900 dark:text-white">
									{overview.overview.totalPolicies}
								</span>
							</div>
							<p className="text-xs text-zinc-500 dark:text-zinc-400">Policies</p>
						</div>
						<div className="text-center">
							<div className="flex items-center justify-center mb-1">
								<IconUsers className="w-4 h-4 text-zinc-500 mr-1" />
								<span className="text-lg font-semibold text-zinc-900 dark:text-white">
									{overview.overview.totalMembers}
								</span>
							</div>
							<p className="text-xs text-zinc-500 dark:text-zinc-400">Members</p>
						</div>
						<div className="text-center">
							<div className="flex items-center justify-center mb-1">
								<IconClock className="w-4 h-4 text-amber-600 mr-1" />
								<span className="text-lg font-semibold text-amber-600 dark:text-amber-400">
									{overview.overview.pendingAcknowledgments}
								</span>
							</div>
							<p className="text-xs text-zinc-500 dark:text-zinc-400">Pending</p>
						</div>
					</div>
				</div>
			</div>

			{/* Alerts */}
			{overview.overview.overdueAcknowledgments > 0 && (
				<div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-900/30">
					<div className="flex items-center">
						<IconAlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2 flex-shrink-0" />
						<p className="text-sm text-red-700 dark:text-red-300">
							<span className="font-medium">{overview.overview.overdueAcknowledgments}</span> overdue acknowledgments require immediate attention
						</p>
					</div>
				</div>
			)}

			{/* Non-Compliant Policies */}
			{overview.topNonCompliantPolicies.length > 0 && (
				<div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700">
					<h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">
						Policies Needing Attention
					</h4>
					<div className="space-y-2">
						{overview.topNonCompliantPolicies.map((policy) => (
							<div key={policy.id} className="flex items-center justify-between py-2">
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
										{policy.name}
									</p>
									<div className="flex items-center space-x-2 mt-1">
										<div className="w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full h-1">
											<div
												className="h-1 rounded-full"
												style={{
													width: `${policy.complianceRate}%`,
													backgroundColor: policy.complianceRate >= 70 ? '#f59e0b' : '#ef4444'
												}}
											/>
										</div>
										<span className={clsx(
											"text-xs font-medium",
											policy.complianceRate >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
										)}>
											{Math.round(policy.complianceRate)}%
										</span>
									</div>
								</div>
								{policy.overdueCount > 0 && (
									<span className="text-xs text-red-600 dark:text-red-400 font-medium ml-2">
										{policy.overdueCount} overdue
									</span>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* Footer */}
			<div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-700">
				<button
					onClick={handleViewDetails}
					className="w-full flex items-center justify-center space-x-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
				>
					<span>View Detailed Report</span>
					<IconChevronRight className="w-4 h-4" />
				</button>
			</div>
		</motion.div>
	);
};

export default ComplianceOverviewWidget;