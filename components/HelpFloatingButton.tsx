"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Menu, Dialog } from "@headlessui/react";
import {
	IconLifebuoy,
	IconBook,
	IconBrandGithub,
	IconBug,
	IconHistory,
	IconCopyright,
	IconX,
	IconCheck,
	IconAlertTriangle,
	IconAlertCircle,
} from "@tabler/icons-react";
import sanitizeHtml from "sanitize-html";
import clsx from "clsx";
import packageJson from "../package.json";

type ChangelogEntry = { title: string; link: string; pubDate: string; content: string };

type RepositoryStatus = {
	upToDate: boolean;
	behind: number;
};

const CHANGELOG_HTML_OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: ["p", "br", "img", "a", "strong", "em", "b", "i", "ul", "ol", "li", "h1", "h2", "h3", "h4", "blockquote", "span", "div"],
	allowedAttributes: { img: ["src", "alt", "width", "height"], a: ["href", "target", "rel"] },
	allowedSchemes: ["https", "http"],
};

const HelpContext = createContext<{
	openChangelog: () => void;
	openCopyright: () => void;
}>({ openChangelog: () => { }, openCopyright: () => { } });

export function useHelp() {
	return useContext(HelpContext);
}

function useRepositoryStatus() {
	const [status, setStatus] = useState<RepositoryStatus | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/repository")
			.then((r) => r.json())
			.then((d) => setStatus(d))
			.catch(() => setStatus(null))
			.finally(() => setLoading(false));
	}, []);

	return { status, loading };
}

function VersionStatusDialog({
	open,
	onClose,
	loading,
	status,
}: {
	open: boolean;
	onClose: () => void;
	loading: boolean;
	status: RepositoryStatus | null;
}) {
	const isCloud = typeof window !== "undefined" && window.location.hostname.includes("planetaryapp.cloud");
	const upToDate = !loading && status !== null && (status.upToDate || status.behind === 0);
	const behind = status?.behind ?? 0;

	type Accent = { bg: string; border: string; icon: string; iconBg: string; titleText: string };
	let accent: Accent;

	if (loading || status === null) {
		accent = {
			bg: "bg-zinc-50 dark:bg-zinc-800/60",
			border: "border-zinc-200 dark:border-zinc-700",
			icon: "text-zinc-400",
			iconBg: "bg-zinc-100 dark:bg-zinc-700",
			titleText: "text-zinc-600 dark:text-zinc-300",
		};
	} else if (upToDate) {
		accent = {
			bg: "bg-emerald-50 dark:bg-emerald-900/20",
			border: "border-emerald-200 dark:border-emerald-700/50",
			icon: "text-emerald-500",
			iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
			titleText: "text-emerald-700 dark:text-emerald-300",
		};
	} else if (behind <= 2) {
		accent = {
			bg: "bg-amber-50 dark:bg-amber-900/20",
			border: "border-amber-200 dark:border-amber-700/50",
			icon: "text-amber-500",
			iconBg: "bg-amber-100 dark:bg-amber-900/40",
			titleText: "text-amber-700 dark:text-amber-300",
		};
	} else {
		accent = {
			bg: "bg-red-50 dark:bg-red-900/20",
			border: "border-red-200 dark:border-red-700/50",
			icon: "text-red-500",
			iconBg: "bg-red-100 dark:bg-red-900/40",
			titleText: "text-red-700 dark:text-red-300",
		};
	}

	const StatusIcon = loading || status === null
		? IconAlertCircle
		: upToDate
		? IconCheck
		: behind <= 2
		? IconAlertTriangle
		: IconAlertCircle;

	const headline = loading || status === null
		? "Checking for updates…"
		: upToDate
		? "Your Orbit is up to date!"
		: behind === 1
		? "Your Orbit is 1 commit behind."
		: `Your Orbit is ${behind} commits behind.`;

	const subtext = loading || status === null
		? "Fetching repository status from GitHub."
		: upToDate
		? "You're running the latest version of Orbit. You're hot to go!"
		: isCloud
		? "Our team will update this instance soon!"
		: "Please update your instance to get the latest features and fixes.";

	return (
		<Dialog open={open} onClose={onClose} className="relative z-[99999]">
			<div className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" aria-hidden="true" />
			<div className="fixed inset-0 flex items-center justify-center p-4">
				<Dialog.Panel className="mx-auto w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-800 shadow-2xl border border-zinc-200/80 dark:border-zinc-700/80 overflow-hidden">

					{/* Coloured status banner */}
					<div className={`px-5 py-4 border-b ${accent.bg} ${accent.border}`}>
						<div className="flex items-start gap-3">
							<div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent.iconBg}`}>
								<StatusIcon className={`w-5 h-5 ${accent.icon}`} stroke={2} />
							</div>
							<div className="min-w-0 pt-0.5">
								<p className={`text-sm font-semibold leading-tight ${accent.titleText}`}>{headline}</p>
								<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">{subtext}</p>
							</div>
						</div>
					</div>

					{/* Meta rows */}
					<div className="px-5 py-4 space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-xs text-zinc-400 dark:text-zinc-500">Version</span>
							<span className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">v{packageJson.version}</span>
						</div>
						{!loading && status !== null && (
							<div className="flex items-center justify-between">
								<span className="text-xs text-zinc-400 dark:text-zinc-500">Commits behind</span>
								<span className={`text-xs font-mono font-medium ${
									upToDate ? "text-emerald-500" : behind <= 2 ? "text-amber-500" : "text-red-500"
								}`}>
									{upToDate ? "0 — latest" : behind === -1 ? "unknown" : behind}
								</span>
							</div>
						)}
					</div>

					{/* Footer */}
					<div className="px-4 pb-4">
						<div className="border-t border-zinc-100 dark:border-zinc-700 pt-3 flex items-center gap-1.5">
							<a
								href="https://docs.planetaryapp.us"
								target="_blank"
								rel="noopener noreferrer"
								className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 py-2 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
							>
								<IconBook className="w-3.5 h-3.5 shrink-0" stroke={1.5} />
								<span>Docs</span>
							</a>
							<a
								href="https://github.com/planetaryorbit/orbit"
								target="_blank"
								rel="noopener noreferrer"
								className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 py-2 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
							>
								<IconBrandGithub className="w-3.5 h-3.5 shrink-0" stroke={1.5} />
								<span>GitHub</span>
							</a>
							<button
								onClick={onClose}
								className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 py-2 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
							>
								<IconX className="w-3.5 h-3.5 shrink-0" stroke={1.5} />
								<span>Close</span>
							</button>
						</div>
					</div>
				</Dialog.Panel>
			</div>
		</Dialog>
	);
}

function VersionDot({
	loading,
	status,
	onClick,
}: {
	loading: boolean;
	status: RepositoryStatus | null;
	onClick: () => void;
}) {
	let dotColor: string;
	let ringColor: string;
	let badgeBg: string;
	let label: string | null = null;
	let labelColor: string;

	if (loading || status === null) {
		dotColor = "bg-zinc-400";
		ringColor = "ring-zinc-400/20";
		badgeBg = "bg-zinc-100 dark:bg-zinc-700/60 border-zinc-200 dark:border-zinc-600";
		labelColor = "text-zinc-500 dark:text-zinc-400";
	} else if (status.upToDate || status.behind === 0) {
		dotColor = "bg-emerald-400";
		ringColor = "ring-emerald-400/20";
		badgeBg = "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700/50";
		labelColor = "text-emerald-600 dark:text-emerald-400";
	} else if (status.behind <= 2) {
		dotColor = "bg-amber-400";
		ringColor = "ring-amber-400/20";
		badgeBg = "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700/50";
		label = `${status.behind} behind`;
		labelColor = "text-amber-600 dark:text-amber-400";
	} else {
		dotColor = "bg-red-400";
		ringColor = "ring-red-400/20";
		badgeBg = "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/50";
		label = `${status.behind} behind`;
		labelColor = "text-red-600 dark:text-red-400";
	}

	return (
		<button
			type="button"
			onClick={onClick}
			className={`inline-flex items-center gap-1.5 mt-0.5 pl-1.5 pr-2 py-0.5 rounded-full border transition-opacity hover:opacity-75 ${badgeBg}`}
		>
			<span className="relative flex h-2 w-2 shrink-0">
				<span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${dotColor}`} />
				<span className={`relative inline-flex h-2 w-2 rounded-full ring-2 ${dotColor} ${ringColor}`} />
			</span>
			<span className={`text-[11px] font-medium ${labelColor}`}>v{packageJson.version}</span>
			{label && (
				<span className={`text-[10px] font-medium leading-none ${labelColor}`}>
					· {label}
				</span>
			)}
		</button>
	);
}

export function HelpProvider({ children }: { children: React.ReactNode }) {
	const [showChangelog, setShowChangelog] = useState(false);
	const [showCopyright, setShowCopyright] = useState(false);
	const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
	const [changelogLoading, setChangelogLoading] = useState(false);

	const openChangelog = useCallback(() => setShowChangelog(true), []);
	const openCopyright = useCallback(() => setShowCopyright(true), []);

	useEffect(() => {
		if (!showChangelog) return;
		setChangelogLoading(true);
		fetch("/api/changelog")
			.then((res) => res.json())
			.then((data) => {
				const items = Array.isArray(data) ? data : data?.items ?? [];
				setChangelog(Array.isArray(items) ? items : []);
			})
			.catch(() => setChangelog([]))
			.finally(() => setChangelogLoading(false));
	}, [showChangelog]);

	return (
		<HelpContext.Provider value={{ openChangelog, openCopyright }}>
			{children}

			<Dialog open={showCopyright} onClose={() => setShowCopyright(false)} className="relative z-[99999]">
				<div className="fixed inset-0 bg-black/30" aria-hidden="true" />
				<div className="fixed inset-0 flex items-center justify-center p-4">
					<Dialog.Panel className="mx-auto max-w-lg rounded-2xl bg-white dark:bg-zinc-800 p-6 shadow-xl">
						<div className="flex items-center justify-between mb-4">
							<Dialog.Title className="text-lg font-medium text-zinc-900 dark:text-white">
								© Copyright Notices
							</Dialog.Title>
							<button
								onClick={() => setShowCopyright(false)}
								className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
							>
								<IconX className="w-5 h-5 text-zinc-500" />
							</button>
						</div>
						<div className="mb-4">
							<p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">Orbit</p>
							<p className="text-sm text-zinc-500 dark:text-zinc-400">© 2025 Planetary — All rights reserved.</p>
						</div>
						<div className="border-t border-zinc-200 dark:border-zinc-700 my-4" />
						<div>
							<p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">Original Tovy Project</p>
							<p className="text-sm text-zinc-500 dark:text-zinc-400">© 2022 Tovy — All rights reserved.</p>
						</div>
					</Dialog.Panel>
				</div>
			</Dialog>

			<Dialog open={showChangelog} onClose={() => setShowChangelog(false)} className="relative z-[99999]">
				<div className="fixed inset-0 bg-black/30" aria-hidden="true" />
				<div className="fixed inset-0 flex items-center justify-center p-4">
					<Dialog.Panel className="mx-auto max-w-lg rounded-2xl bg-white dark:bg-zinc-800 p-6 shadow-xl max-h-[90vh] flex flex-col">
						<div className="flex items-center justify-between mb-4 flex-shrink-0">
							<Dialog.Title className="text-lg font-medium text-zinc-900 dark:text-white">Changelog</Dialog.Title>
							<button
								onClick={() => setShowChangelog(false)}
								className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
							>
								<IconX className="w-5 h-5 text-zinc-500" />
							</button>
						</div>
						<div className="space-y-6 overflow-y-auto flex-1 min-h-0">
							{changelogLoading && <p className="text-sm text-zinc-500">Loading...</p>}
							{!changelogLoading && changelog.length === 0 && <p className="text-sm text-zinc-500">No entries found.</p>}
							{!changelogLoading &&
								changelog.map((entry, idx) => (
									<div
										key={idx}
										className={clsx(
											"pb-6",
											idx < changelog.length - 1 && "border-b border-zinc-200 dark:border-zinc-700"
										)}
									>
										<a
											href={entry.link}
											target="_blank"
											rel="noopener noreferrer"
											className="font-semibold text-primary hover:underline"
										>
											{entry.title}
										</a>
										<div className="text-xs text-zinc-400 mt-1 mb-3">{entry.pubDate}</div>
										<div
											className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:my-2 prose-img:rounded-lg prose-img:max-w-full"
											dangerouslySetInnerHTML={{
												__html: sanitizeHtml(entry.content || "", CHANGELOG_HTML_OPTIONS),
											}}
										/>
									</div>
								))}
						</div>
					</Dialog.Panel>
				</div>
			</Dialog>
		</HelpContext.Provider>
	);
}

export function HelpFloatingButton() {
	const { openChangelog, openCopyright } = useHelp();
	const { status, loading } = useRepositoryStatus();
	const [showVersionDialog, setShowVersionDialog] = useState(false);

	return (
		<>
			<Menu as="div" className="fixed bottom-6 right-6 z-[99998]">
				<Menu.Button
					className="flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-600/80 text-zinc-500 dark:text-zinc-400 hover:text-[color:rgb(var(--group-theme))] hover:border-[color:rgb(var(--group-theme)/0.3)] hover:bg-white dark:hover:bg-zinc-700/90 transition-all duration-200 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgb(var(--group-theme)/0.4)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-900"
					title="Help & resources"
				>
					<IconLifebuoy className="w-6 h-6" stroke={1.5} />
				</Menu.Button>
				<Menu.Items
					className={clsx(
						"absolute right-0 bottom-full mb-2 w-56 rounded-2xl bg-white dark:bg-zinc-800 shadow-xl border border-zinc-200/80 dark:border-zinc-600/80 py-2.5 focus:outline-none z-50",
						"ring-1 ring-black/5 dark:ring-white/5"
					)}
				>
					<div className="px-4 pb-2.5 pt-0.5">
						<p className="text-xs font-semibold text-zinc-900 dark:text-white tracking-tight">Orbit</p>
						<VersionDot
							loading={loading}
							status={status}
							onClick={() => setShowVersionDialog(true)}
						/>
					</div>
					<div className="h-px bg-zinc-200/80 dark:bg-zinc-600/80 mx-3 mb-2" />
					<a
						href="https://docs.planetaryapp.us"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/70 transition-colors"
					>
						<IconBook className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" stroke={1.5} />
						<span>Documentation</span>
					</a>
					<a
						href="https://github.com/planetaryorbit/orbit"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/70 transition-colors"
					>
						<IconBrandGithub className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" stroke={1.5} />
						<span>GitHub</span>
					</a>
					<a
						href="https://feedback.planetaryapp.us/bugs"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/70 transition-colors"
					>
						<IconBug className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" stroke={1.5} />
						<span>Bug Reports</span>
					</a>
					<Menu.Item>
						{({ active }) => (
							<button
								onClick={() => openChangelog()}
								className={clsx(
									"w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 transition-colors text-left",
									active && "bg-zinc-100 dark:bg-zinc-700/70"
								)}
							>
								<IconHistory className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" stroke={1.5} />
								<span>Changelog</span>
							</button>
						)}
					</Menu.Item>
					<div className="h-px bg-zinc-200/80 dark:bg-zinc-600/80 mx-3 my-2" />
					<Menu.Item>
						{({ active }) => (
							<button
								onClick={() => openCopyright()}
								className={clsx(
									"w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 transition-colors text-left",
									active && "bg-zinc-100 dark:bg-zinc-700/70"
								)}
							>
								<IconCopyright className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" stroke={1.5} />
								<span>Copyright Notices</span>
							</button>
						)}
					</Menu.Item>
				</Menu.Items>
			</Menu>

			<VersionStatusDialog
				open={showVersionDialog}
				onClose={() => setShowVersionDialog(false)}
				loading={loading}
				status={status}
			/>
		</>
	);
}

export default HelpFloatingButton;