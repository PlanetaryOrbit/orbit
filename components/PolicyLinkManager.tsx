import React, { FC, useState, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import {
	IconShare,
	IconCopy,
	IconCheck,
	IconExternalLink,
	IconClock,
	IconX,
	IconLink,
	IconShield,
	IconTrash,
	IconEye,
	IconEyeOff,
	IconPlus,
	IconRefresh,
	IconEdit
} from "@tabler/icons-react";
import axios from "axios";
import toast from "react-hot-toast";
import clsx from "clsx";

interface PolicyLink {
	id: string;
	name: string;
	description?: string;
	url: string;
	createdAt: string;
	expiresAt?: string;
	isActive: boolean;
	isExpired: boolean;
	accessCount: number;
	lastAccessed?: string;
	createdBy: {
		username: string;
		picture?: string;
	};
}

interface PolicyLinkManagerProps {
	isOpen: boolean;
	onClose: () => void;
	document: {
		id: string;
		name: string;
		version: number;
	};
	workspaceId: string;
}

const PolicyLinkManager: FC<PolicyLinkManagerProps> = ({
	isOpen,
	onClose,
	document,
	workspaceId
}) => {
	const [links, setLinks] = useState<PolicyLink[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newLinkForm, setNewLinkForm] = useState({
		name: '',
		description: '',
		expiresInHours: 0
	});
	const [isCreating, setIsCreating] = useState(false);
	const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			fetchLinks();
		}
	}, [isOpen, workspaceId, document.id]);

	const fetchLinks = async () => {
		setIsLoading(true);
		try {
			const response = await axios.get(`/api/workspace/${workspaceId}/policies/${document.id}/links`);
			setLinks(response.data.links || []);
		} catch (error: any) {
			toast.error('Failed to load links');
			console.error('Failed to fetch links:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const createLink = async () => {
		if (!newLinkForm.name.trim()) {
			toast.error('Please enter a name for the link');
			return;
		}

		setIsCreating(true);
		try {
			const response = await axios.post(`/api/workspace/${workspaceId}/policies/${document.id}/links`, {
				name: newLinkForm.name.trim(),
				description: newLinkForm.description.trim(),
				expiresInHours: newLinkForm.expiresInHours
			});

			setLinks([response.data.link, ...links]);
			setNewLinkForm({ name: '', description: '', expiresInHours: 0 });
			setShowCreateForm(false);
			toast.success('Link created successfully');
		} catch (error: any) {
			toast.error(error.response?.data?.error || 'Failed to create link');
		} finally {
			setIsCreating(false);
		}
	};

	const deleteLink = async (linkId: string) => {
		try {
			await axios.delete(`/api/workspace/${workspaceId}/policies/${document.id}/links`, {
				data: { linkId }
			});

			setLinks(links.filter(link => link.id !== linkId));
			toast.success('Link deleted successfully');
		} catch (error: any) {
			toast.error(error.response?.data?.error || 'Failed to delete link');
		}
	};

	const toggleLinkStatus = async (linkId: string, isActive: boolean) => {
		try {
			const response = await axios.patch(`/api/workspace/${workspaceId}/policies/${document.id}/links`, {
				linkId,
				isActive
			});

			setLinks(links.map(link =>
				link.id === linkId ? { ...link, isActive } : link
			));
			toast.success(isActive ? 'Link activated' : 'Link deactivated');
		} catch (error: any) {
			toast.error('Failed to update link status');
		}
	};

	const copyToClipboard = async (url: string, linkId: string) => {
		try {
			await navigator.clipboard.writeText(url);
			setCopiedLinkId(linkId);
			toast.success('Link copied to clipboard');
			setTimeout(() => setCopiedLinkId(null), 2000);
		} catch (error) {
			toast.error('Failed to copy link');
		}
	};

	const openLink = (url: string) => {
		window.open(url, '_blank');
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
			<motion.div
				initial={{ opacity: 0, scale: 0.98 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.18 }}
				className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden max-h-[90vh] flex flex-col"
			>
				{/* Header */}
				<div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex-shrink-0">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-3">
							<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
								<IconShare className="w-5 h-5 text-primary" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
									Manage Policy Links
								</h2>
								<p className="text-sm text-zinc-500 dark:text-zinc-400">
									{document.name}
								</p>
							</div>
						</div>
						<div className="flex items-center space-x-2">
							<button
								onClick={() => setShowCreateForm(!showCreateForm)}
								className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
							>
								<IconPlus className="w-4 h-4 mr-1" />
								New Link
							</button>
							<button
								onClick={fetchLinks}
								className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
							>
								<IconRefresh className="w-4 h-4" />
							</button>
							<button
								onClick={onClose}
								className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
							>
								<IconX className="w-5 h-5" />
							</button>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-hidden flex flex-col">
					{/* Create Form */}
					<AnimatePresence>
						{showCreateForm && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
							>
								<div className="space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
												Link Name *
											</label>
											<input
												type="text"
												value={newLinkForm.name}
												onChange={(e) => setNewLinkForm({ ...newLinkForm, name: e.target.value })}
												placeholder="e.g., HR Team Link, Manager Access"
												className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
												Expires In
											</label>
											<select
												value={newLinkForm.expiresInHours}
												onChange={(e) => setNewLinkForm({ ...newLinkForm, expiresInHours: parseInt(e.target.value) })}
												className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
											>
												<option value={0}>Never expires</option>
												<option value={1}>1 hour</option>
												<option value={24}>24 hours</option>
												<option value={168}>1 week</option>
												<option value={720}>1 month</option>
											</select>
										</div>
									</div>
									<div>
										<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
											Description (Optional)
										</label>
										<input
											type="text"
											value={newLinkForm.description}
											onChange={(e) => setNewLinkForm({ ...newLinkForm, description: e.target.value })}
											placeholder="Add a note about this link's purpose"
											className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
										/>
									</div>
									<div className="flex items-center justify-end space-x-2">
										<button
											onClick={() => setShowCreateForm(false)}
											className="px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
										>
											Cancel
										</button>
										<button
											onClick={createLink}
											disabled={isCreating || !newLinkForm.name.trim()}
											className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											{isCreating ? (
												<>
													<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
													Creating...
												</>
											) : (
												<>
													<IconPlus className="w-4 h-4 mr-1" />
													Create Link
												</>
											)}
										</button>
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Links List */}
					<div className="flex-1 overflow-y-auto">
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
							</div>
						) : links.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<IconLink className="w-12 h-12 text-zinc-400 mb-4" />
								<h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
									No Links Created
								</h3>
								<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
									Create your first shareable link to get started
								</p>
								<button
									onClick={() => setShowCreateForm(true)}
									className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
								>
									<IconPlus className="w-4 h-4 mr-2" />
									Create First Link
								</button>
							</div>
						) : (
							<div className="p-6">
								<div className="space-y-4">
									{links.map((link) => (
										<div
											key={link.id}
											className={clsx(
												"p-4 rounded-lg border transition-colors",
												link.isActive && !link.isExpired
													? "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
													: "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 opacity-75"
											)}
										>
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<div className="flex items-center space-x-2 mb-2">
														<h4 className="font-medium text-zinc-900 dark:text-zinc-100">
															{link.name}
														</h4>
														{!link.isActive && (
															<span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
																Inactive
															</span>
														)}
														{link.isExpired && (
															<span className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
																Expired
															</span>
														)}
													</div>

													{link.description && (
														<p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
															{link.description}
														</p>
													)}

													<div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
														<p>Created by {link.createdBy.username} on {new Date(link.createdAt).toLocaleDateString()}</p>
														{link.expiresAt && (
															<p>
																{link.isExpired ? 'Expired' : 'Expires'} on {new Date(link.expiresAt).toLocaleDateString()}
															</p>
														)}
														<p>Access count: {link.accessCount}</p>
														{link.lastAccessed && (
															<p>Last accessed: {new Date(link.lastAccessed).toLocaleString()}</p>
														)}
													</div>

													<div className="mt-3 p-2 bg-zinc-50 dark:bg-zinc-900 rounded border text-xs font-mono break-all">
														{link.url}
													</div>
												</div>

												<div className="flex items-center space-x-1 ml-4">
													<button
														onClick={() => copyToClipboard(link.url, link.id)}
														className={clsx(
															"p-2 rounded-md border transition-colors",
															copiedLinkId === link.id
																? "bg-green-50 border-green-200 text-green-600"
																: "border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700"
														)}
														title="Copy to clipboard"
													>
														{copiedLinkId === link.id ? <IconCheck className="w-4 h-4" /> : <IconCopy className="w-4 h-4" />}
													</button>

													<button
														onClick={() => openLink(link.url)}
														className="p-2 rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
														title="Open link"
													>
														<IconExternalLink className="w-4 h-4" />
													</button>

													<button
														onClick={() => toggleLinkStatus(link.id, !link.isActive)}
														className="p-2 rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
														title={link.isActive ? "Deactivate" : "Activate"}
													>
														{link.isActive ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
													</button>

													<button
														onClick={() => deleteLink(link.id)}
														className="p-2 rounded-md border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
														title="Delete link"
													>
														<IconTrash className="w-4 h-4" />
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</motion.div>
		</div>
	);
};

export default PolicyLinkManager;