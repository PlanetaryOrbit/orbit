import type { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import Workspace from "@/layouts/workspace";
import { useRecoilState } from "recoil";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import prisma, { document } from "@/utils/database";
import { GetServerSideProps } from "next";
import { withSessionSsr } from "@/lib/withSession";
import {
	IconFileText,
	IconClock,
	IconAlertTriangle,
	IconExternalLink,
	IconLink,
	IconShield,
	IconCheck,
	IconArrowLeft
} from "@tabler/icons-react";
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import PolicyAcknowledgmentModal from "@/components/PolicyAcknowledgmentModal";
import axios from "axios";
import toast from "react-hot-toast";

export const getServerSideProps = withSessionSsr(async (context: any): Promise<any> => {
	const { id, docId } = context.query;
	const userid = context.req.session.userid;

	if (!userid) {
		return {
			redirect: {
				destination: '/login',
			}
		}
	}
	if (!id || !docId) {
		return {
			notFound: true,
		};
	}

	const document: any = await prisma.document.findFirst({
		where: {
			id: docId as string,
			workspaceGroupId: parseInt(id as string),
			requiresAcknowledgment: true
		},
		select: {
			id: true,
			name: true,
			content: true,
			acknowledgmentDeadline: true,
			acknowledgmentMethod: true,
			acknowledgmentWord: true,
			isTrainingDocument: true,
			requiresAcknowledgment: true,
			createdAt: true,
			owner: {
				select: {
					username: true,
					picture: true
				}
			},
			roles: {
				select: {
					id: true,
					name: true
				}
			},
			departments: {
				select: {
					id: true,
					name: true
				}
			}
		}
	});

	if (!document) {
		return {
			notFound: true,
		};
	}

	const user = await prisma.user.findFirst({
		where: {
			userid: BigInt(userid)
		},
		include: {
			roles: {
				where: {
					workspaceGroupId: parseInt(id as string)
				}
			},
			workspaceMemberships: {
				where: {
					workspaceGroupId: parseInt(id as string)
				},
				include: {
					departmentMembers: {
						include: {
							department: true
						}
					}
				}
			}
		}
	});

	if (!user) {
		return {
			redirect: {
				destination: '/login',
			}
		};
	}

	const userRoleIds = user.roles.map(r => r.id);
	const userDepartmentIds = user.workspaceMemberships?.[0]?.departmentMembers?.map(dm => dm.department.id) || [];
	const hasRoleAccess = document.roles.length > 0 && document.roles.some((role: any) => userRoleIds.includes(role.id));
	const hasDepartmentAccess = document.departments.length > 0 && document.departments.some((dept: any) => userDepartmentIds.includes(dept.id));
	const noRestrictions = document.roles.length === 0 && document.departments.length === 0;
	const hasAccess = hasRoleAccess || hasDepartmentAccess || noRestrictions;

	if (!hasAccess) {
		return {
			redirect: {
				destination: `/workspace/${id}`,
			}
		};
	}

	const config = await prisma.config.findFirst({
		where: {
			workspaceGroupId: parseInt(id as string),
			key: "policies",
		},
	});

	let policiesEnabled = false;
	if (config?.value) {
		let val = config.value;
		if (typeof val === "string") {
			try {
				val = JSON.parse(val);
			} catch {
				val = {};
			}
		}
		policiesEnabled =
			typeof val === "object" && val !== null && "enabled" in val
				? (val as { enabled?: boolean }).enabled ?? false
				: false;
	}

	if (!policiesEnabled) {
		return { notFound: true };
	}

	const existingAcknowledgment = await prisma.policyAcknowledgment.findFirst({
		where: {
			userId: BigInt(userid),
			documentId: document.id,
		}
	});

	return {
		props: {
			document: JSON.parse(JSON.stringify(document, (key, value) => (typeof value === 'bigint' ? value.toString() : value))),
			alreadyAcknowledged: !!existingAcknowledgment,
			acknowledgment: existingAcknowledgment ? JSON.parse(JSON.stringify(existingAcknowledgment, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) : null
		}
	}
});

type pageProps = {
	document: document & {
		owner: { username: string, picture: string },
		roles: Array<{ id: string, name: string }>
	},
	alreadyAcknowledged: boolean,
	acknowledgment?: any
}

const PolicySignPage: pageWithLayout<pageProps> = ({ document, alreadyAcknowledged, acknowledgment }) => {
	const [login, setLogin] = useRecoilState(loginState);
	const router = useRouter();
	const [showAcknowledgmentModal, setShowAcknowledgmentModal] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [hasVisitedExternalDoc, setHasVisitedExternalDoc] = useState(false);

	const isOverdue = document.acknowledgmentDeadline &&
		new Date() > new Date(document.acknowledgmentDeadline);

	const getDeadlineStatus = () => {
		if (!document.acknowledgmentDeadline) return null;

		const now = new Date();
		const deadline = new Date(document.acknowledgmentDeadline);
		const timeDiff = deadline.getTime() - now.getTime();
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

	const deadlineStatus = getDeadlineStatus();

	const handleAcknowledged = () => {
		setShowAcknowledgmentModal(false);
		router.reload(); // Refresh to show acknowledgment status
	};

	const handleExternalDocClick = (url: string) => {
		setHasVisitedExternalDoc(true);
		window.open(url, '_blank', 'noopener,noreferrer');
	};

	const handleGoToDashboard = () => {
		router.push(`/workspace/${router.query.id}`);
	};

	const isExternalDocument = document.content && typeof document.content === 'object' && (document.content as any).external;

	return (
		<div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
			<Toaster position="bottom-center" />
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				{/* Header */}
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center space-x-4">
						<button
							onClick={() => router.back()}
							className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
						>
							<IconArrowLeft className="w-5 h-5" />
						</button>
						<div>
							<h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Policy Acknowledgment</h1>
							<p className="text-sm text-zinc-500 dark:text-zinc-300">
								Direct link to sign policy document
							</p>
						</div>
					</div>
					<button
						onClick={handleGoToDashboard}
						className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
					>
						Go to Dashboard
					</button>
				</div>

				{/* Policy Document Card */}
				<div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
					{/* Header */}
					<div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
						<div className="flex items-center space-x-4">
							<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
								<IconShield className="w-6 h-6 text-primary" />
							</div>
							<div className="flex-1">
								<div className="flex items-center space-x-2">
									<h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
										{document.name}
									</h2>
									{document.isTrainingDocument && (
										<span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
											Training Document
										</span>
									)}
									<span className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
										Policy
									</span>
								</div>
								<div className="flex items-center space-x-4 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
									<span>Created by {document.owner.username}</span>
									{deadlineStatus && (
										<>
											<span>•</span>
											<span className={deadlineStatus.color}>
												{deadlineStatus.message}
											</span>
										</>
									)}
								</div>
							</div>
						</div>

						{/* Status Banner */}
						{alreadyAcknowledged ? (
							<div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
								<div className="flex items-center space-x-2">
									<IconCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
									<div>
										<p className="text-sm font-medium text-green-800 dark:text-green-200">
											Already Acknowledged
										</p>
										<p className="text-xs text-green-700 dark:text-green-300 mt-1">
											You acknowledged this policy on {new Date(acknowledgment.acknowledgedAt).toLocaleDateString()}
										</p>
									</div>
								</div>
							</div>
						) : isOverdue ? (
							<div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
								<div className="flex items-center space-x-2">
									<IconAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
									<div>
										<p className="text-sm font-medium text-red-800 dark:text-red-200">
											Overdue for Acknowledgment
										</p>
										<p className="text-xs text-red-700 dark:text-red-300 mt-1">
											This policy was due for acknowledgment on {new Date(document.acknowledgmentDeadline!).toLocaleDateString()}
										</p>
									</div>
								</div>
							</div>
						) : deadlineStatus?.status === 'today' || deadlineStatus?.status === 'soon' ? (
							<div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
								<div className="flex items-center space-x-2">
									<IconClock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
									<div>
										<p className="text-sm font-medium text-amber-800 dark:text-amber-200">
											Acknowledgment Required
										</p>
										<p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
											{deadlineStatus.message}
										</p>
									</div>
								</div>
							</div>
						) : (
							<div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
								<div className="flex items-center space-x-2">
									<IconFileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
									<div>
										<p className="text-sm font-medium text-blue-800 dark:text-blue-200">
											Acknowledgment Required
										</p>
										<p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
											Please read and acknowledge this policy document
										</p>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Document Content Preview */}
					<div className="px-6 py-4">
						<h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">
							Policy Content
						</h3>

						{document.content && typeof document.content === 'object' && (document.content as any).external ? (
							<div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
								<p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
									This policy links to an external document:
								</p>
								<button
									onClick={() => handleExternalDocClick((document.content as any).url)}
									className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
								>
									<IconExternalLink className="w-4 h-4" />
									<span>Open External Document</span>
								</button>
								{hasVisitedExternalDoc && (
									<div className="flex items-center space-x-2 mt-3">
										<IconCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
										<span className="text-sm text-green-600 dark:text-green-400">
											External document visited
										</span>
									</div>
								)}
								<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
									You must visit the external document before you can acknowledge this policy.
								</p>
							</div>
						) : (
							<div className="prose prose-sm dark:prose-invert max-w-none">
								<div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 max-h-80 overflow-y-auto">
									<div className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100 font-sans leading-relaxed">
										{typeof document.content === 'string'
											? document.content
											: JSON.stringify(document.content, null, 2)
										}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Action Section */}
					<div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
						{alreadyAcknowledged ? (
							<div className="text-center">
								<p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
									You have already acknowledged this policy. Thank you for your compliance.
								</p>
								<button
									onClick={handleGoToDashboard}
									className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
								>
									Return to Dashboard
								</button>
							</div>
						) : (
							<div className="text-center">
								<p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
									Please review the policy content above and click the button below to proceed with acknowledgment.
								</p>
								<button
									onClick={() => setShowAcknowledgmentModal(true)}
									disabled={isExternalDocument && !hasVisitedExternalDoc}
									className="inline-flex items-center px-6 py-3 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
								>
									<IconShield className="w-4 h-4 mr-2" />
									Acknowledge This Policy
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Role Information */}
			</div>

			{/* Policy Acknowledgment Modal */}
			{showAcknowledgmentModal && (
				<PolicyAcknowledgmentModal
					isOpen={showAcknowledgmentModal}
					onClose={() => setShowAcknowledgmentModal(false)}
					document={document}
					workspaceId={router.query.id as string}
					onAcknowledged={handleAcknowledged}
					initialExternalDocVisited={hasVisitedExternalDoc}
					currentUsername={login.username}
				/>
			)}
		</div>
	);
};

PolicySignPage.layout = Workspace;

export default PolicySignPage;