/* eslint-disable react-hooks/rules-of-hooks */
import type { NextPage } from "next";
import Head from "next/head";
import Sidebar from "@/components/sidebar";
import type { LayoutProps } from "@/layoutTypes";
import axios from "axios";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import { useRouter } from "next/router";
import WorkspaceBirthdayPrompt from '@/components/bdayprompt';
import { getRGBFromTailwindColor } from "@/utils/themeColor";
import { useEffect, useState } from "react";
import clsx from 'clsx';
import { HelpProvider, HelpFloatingButton } from "@/components/HelpFloatingButton";

const workspace: LayoutProps = ({ children }) => {
	const [workspace, setWorkspace] = useRecoilState(workspacestate);
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);

	useEffect(() => {
		router.events.on("routeChangeStart", () => setLoading(true));
		router.events.on("routeChangeComplete", () => setLoading(false));
	}, [router.events]);

	useEffect(() => {
		async function getworkspace() {
			try {
				const res = await axios.get("/api/workspace/" + router.query.id);
				setWorkspace(res.data.workspace);
			} catch (e: any) {
				router.push("/");
			}
		}
		if (router.query.id) getworkspace();
	}, [router.query.id, setWorkspace, router]);

	useEffect(() => {
		if (workspace && workspace.groupTheme) {
			const rgb = getRGBFromTailwindColor(workspace.groupTheme);
			document.documentElement.style.setProperty("--group-theme", rgb);
		}
	}, [workspace]);

	return (
		<div className="h-screen bg-zinc-50 dark:bg-zinc-900">
			<Head>
				<title>{workspace.groupName ? `Orbit - ${workspace.groupName}` : "Loading..."}</title>
				<link rel="icon" href={`${workspace.groupThumbnail}`} />
			</Head>

			<HelpProvider>
				<div className="flex h-screen overflow-hidden">
					<Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

					<main
						className={clsx(
							"flex-1 transition-all duration-300 overflow-y-auto",
							isCollapsed ? "lg:ml-[72px]" : "lg:ml-56",
							"pb-20 lg:pb-0"
						)}
					>
						<div className="relative z-10">
							{children}
						</div>
						{router.query.id && (
							<WorkspaceBirthdayPrompt workspaceId={router.query.id as string} />
						)}
					</main>
				</div>
				<HelpFloatingButton />
			</HelpProvider>
		</div>
	);
};

export default workspace;