/* eslint-disable react-hooks/rules-of-hooks */
import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Sidebar from "@/components/sidebar";
import type { LayoutProps } from "@/layoutTypes";
import axios from "axios";
import { Transition } from "@headlessui/react";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import { useRouter } from "next/router";
import WorkspaceBirthdayPrompt from '@/components/bdayprompt';
import { getRGBFromTailwindColor } from "@/utils/themeColor";
import { useEffect, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconMenu2 } from "@tabler/icons-react";
import clsx from 'clsx';
import { HelpProvider, HelpFloatingButton } from "@/components/HelpFloatingButton";


const workspace: LayoutProps = ({ children }) => {
	const [workspace, setWorkspace] = useRecoilState(workspacestate);
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [open, setOpen] = useState(true);

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

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
			setOpen(window.innerWidth >= 768);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	return (
		<div className="h-screen bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
			<Head>
				<title>{workspace.groupName ? `Orbit - ${workspace.groupName}` : "Loading..."}</title>
				<link rel="icon" href={`${workspace.groupThumbnail}`} />
			</Head>

			<Transition
				show={open}
				enter="transition-opacity duration-300"
				enterFrom="opacity-0"
				enterTo="opacity-100"
				leave="transition-opacity duration-300"
				leaveFrom="opacity-100"
				leaveTo="opacity-0"
			>
				<div
					className={`fixed inset-0 bg-black bg-opacity-50 z-20 ${
						!isMobile ? "hidden" : ""
					}`}
					onClick={() => setOpen(false)}
				/>
			</Transition>

			<HelpProvider>
				<div className="flex h-screen">
					<Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

					<main
						className={clsx(
							"flex-1 transition-all duration-300 overflow-y-auto",
							!isMobile && (isCollapsed ? "ml-[72px]" : "ml-56")
						)}>
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