/* eslint-disable react-hooks/rules-of-hooks */
import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Sidebar from "@/components/sidebar";
import type { LayoutProps } from "@/layoutTypes";
import axios from "axios";
import { Transition } from "@headlessui/react";
import { IconMenu2 } from "@tabler/icons";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import { useRouter } from "next/router";
import hexRgb from "hex-rgb";
import * as colors from "tailwindcss/colors";
import { useEffect, useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons";
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
			"bg-orbit": "#FF0099",
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
			"bg-gray-500": colors.gray[500],
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
		<div className="h-screen bg-gray-50 dark:bg-gray-900">
			<Head>
				<title>{workspace.groupName ? `Orbit - ${workspace.groupName}` : "Loading..."}</title>
				<link rel="icon" href={`${workspace.groupThumbnail}/isCircular`} />
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
    					!isMobile && (isCollapsed ? "ml-16" : "ml-60") // margin only on desktop!
  					)}
>
  					<div className="relative z-10">
    					{children}
  					</div>
				</main>
			</div>
		</div>
	);
};

export default workspace;
