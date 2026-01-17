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
import hexRgb from "hex-rgb";
import * as colors from "tailwindcss/colors";
import WorkspaceBirthdayPrompt from '@/components/bdayprompt';
import { useEffect, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconMenu2 } from "@tabler/icons-react";
import clsx from 'clsx';


const workspace: LayoutProps = ({ children }) => {
	const [workspace, setWorkspace] = useRecoilState(workspacestate);
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [open, setOpen] = useState(true);

	const useTheme = (groupTheme: string) => {
		const themes: Record<string, string> = {
			"bg-pink-100": colors.pink[100],
			"bg-rose-100": colors.rose[100],
			"bg-orange-100": colors.orange[100],
			"bg-amber-100": colors.amber[100],
			"bg-lime-100": colors.lime[100],
			"bg-emerald-100": colors.emerald[100],
			"bg-cyan-100": colors.cyan[100],
			"bg-sky-100": colors.sky[100],
			"bg-indigo-100": colors.indigo[100],
			"bg-purple-100": colors.purple[100],
			"bg-pink-400": colors.pink[400],
			"bg-rose-400": colors.rose[400],
			"bg-orange-400": colors.orange[400],
			"bg-amber-400": colors.amber[400],
			"bg-lime-400": colors.lime[400],
			"bg-emerald-400": colors.emerald[400],
			"bg-cyan-400": colors.cyan[400],
			"bg-sky-400": colors.sky[400],
			"bg-indigo-400": colors.indigo[400],
			"bg-violet-400": colors.violet[400],
			"bg-orbit": "#FF0099",
			"bg-rose-600": colors.rose[600],
			"bg-orange-600": colors.orange[600],
			"bg-amber-600": colors.amber[600],
			"bg-lime-600": colors.lime[600],
			"bg-emerald-600": colors.emerald[600],
			"bg-cyan-600": colors.cyan[600],
			"bg-sky-600": colors.sky[600],
			"bg-indigo-600": colors.indigo[600],
			"bg-violet-600": colors.violet[600],
			"bg-blue-500": colors.blue[500],
			"bg-red-500": colors.red[500],
			"bg-red-700": colors.red[700],
			"bg-green-500": colors.green[500],
			"bg-green-600": colors.green[600],
			"bg-yellow-500": colors.yellow[500],
			"bg-orange-500": colors.orange[500],
			"bg-purple-500": colors.purple[500],
			"bg-pink-500": colors.pink[500],
			"bg-black": colors.black,
			"bg-zinc-500": colors.gray[500],
		};
		const hex = hexRgb(themes[groupTheme] || "#FF0099");
		return `${hex.red} ${hex.green} ${hex.blue}`;
	};

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
			const theme = useTheme(workspace.groupTheme);
			document.documentElement.style.setProperty("--group-theme", theme);
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

			<div className="flex h-screen">
				<Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
				
				<main
		  			className={clsx(
		    		"flex-1 transition-all duration-300 overflow-y-auto",
		    		!isMobile && (isCollapsed ? "ml-16" : "ml-60")
		  			)}>
		  			<div className="relative z-10">
		    		{children}
		  			</div>
		  			{router.query.id && (
		  				<WorkspaceBirthdayPrompt workspaceId={router.query.id as string} />
		  			)}
				</main>
			</div>
		</div>
	);
};

export default workspace;
